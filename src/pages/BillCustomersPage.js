import logo from "../riverbend_logo.png";
import { API } from "aws-amplify";
import {
	Button, Flex, Heading, TextField, TextAreaField, View, Image, Text, Grid, Alert
} from "@aws-amplify/ui-react";
import { useNavigate } from 'react-router-dom'
import { listCustomers as listCustomersQuery } from "../graphql/queries";
import axios from 'axios'
import { Auth } from 'aws-amplify';

export const BillCustomersPage = ({ signOut }) => {
	const navigate = useNavigate();
	const TEST = true;
	let AUTHORIZE_API_KEY, AUTHORIZE_TRANSACTION_KEY, AUTHORIZE_URL;

	if (TEST) {
	  // SANDBOX KEYS
	  AUTHORIZE_API_KEY = "52SQnv5H67P";
	  AUTHORIZE_TRANSACTION_KEY = "9eb46AnVF6E573nk";
	  AUTHORIZE_URL = 'https://apitest.authorize.net/xml/v1/request.api';
	} else {
	  // PRODUCTION KEYS GENERATED JAN 26 2023 08:51:00
	  AUTHORIZE_API_KEY = "4356qj7XWZ";
	  AUTHORIZE_TRANSACTION_KEY = "4uW7a7sm77UTn3d4";
	  AUTHORIZE_URL = 'https://api.authorize.net/xml/v1/request.api';
	}

	async function lambda_handler(event, context) {
	  let anet_pid_to_amount, failed_input, anet_pids;
	  [anet_pid_to_amount, failed_input, anet_pids] = handle_input(event);

	  let customers_to_charge, failed_dynamo;
	  [customers_to_charge, failed_dynamo] = await poll_dynamodb_table(anet_pid_to_amount);

	  const sorted_customers_to_charge = sort_customers_to_charge(customers_to_charge, anet_pids, failed_dynamo);

	  let successes, failed_anet;
	  [successes, failed_anet] = await charge_customers(sorted_customers_to_charge);

	  const failures = [...failed_input, ...failed_dynamo, ...failed_anet];

	  const output = combine_successes_failures(successes, failures, anet_pids);
	  const ret = {
	    'output': output
	  };

		return "{ 'statusCode': 200, 'body': json.dumps(ret) };" // TODO
	}

	async function poll_dynamodb_table(anet_pid_to_amount) {
		console.log("POLLING DYNAMODB")
		const variables = {
			filter: {
		    or: Object.keys(anet_pid_to_amount).map((anet_pid) => ({ authorize_net_profile_id: { eq: parseInt(anet_pid) }}))
		  }
		}

		// const variables = {
		// 	filter: {
		//     or: [
		// 			{ authorize_net_profile_id: { eq: parseInt('1234') }},
		// 			{ authorize_net_profile_id: { eq: parseInt('3456') }},
		// 		]
		//   }
		// }

		console.log("QUERY: ", variables)
		try {
			const result = await API.graphql({
			  query: listCustomersQuery, variables: variables
			});
			console.log("Result: ", result)

			const customers_to_charge = [];
			result.data.listCustomers.items.forEach((item) => {
				const anet_pid = item['authorize_net_profile_id']
				const anet_ppid = item['authorize_net_payment_profile_id']

				if (anet_pid in anet_pid_to_amount) {
					customers_to_charge.push({
	          'anet_pid': anet_pid,
	          'anet_ppid': anet_ppid,
	          'amount': anet_pid_to_amount[anet_pid]
	        });
					delete anet_pid_to_amount[anet_pid];
				}
			});
			return [customers_to_charge, Object.keys(anet_pid_to_amount)];
		} catch (error) {
			console.log("DynamoDB error: ", error)
			return [[], []];
		}
	}

	async function charge_customers(customers_to_charge) {
	  const successes = [];
	  const failures = [];

	  for (const customer of customers_to_charge) {
	    const data = {
	      "createTransactionRequest": {
	        "merchantAuthentication": {
	          "name": AUTHORIZE_API_KEY,
	          "transactionKey": AUTHORIZE_TRANSACTION_KEY
	        },
	        "transactionRequest": {
	          "transactionType": "authCaptureTransaction",
	          "amount": customer['amount'],
	          "profile": {
	            "customerProfileId": customer['anet_pid'],
	            "paymentProfile": { "paymentProfileId": customer['anet_ppid'] }
	          },
	        }
	      }
	    };

	    try {
	      const response = await axios.post(AUTHORIZE_URL, data);
				console.log("ANET RESPONSE: ", response)

	      const text = response.data.lstrip('\ufeff');
	      const responseData = 'json.loads(text);' //TODO
	      console.log('ANET response: ', responseData);

	      if (responseData !== null && 'messages' in responseData) {
	        if ('resultCode' in responseData['messages'] && responseData['messages']['resultCode'] === "Ok") {
	          successes.push([customer['anet_pid'], responseData['transactionResponse']['transId']]);
	        } else {
	          failures.push([customer['anet_pid'], "Anet " + responseData['messages']['message'][0]['text']]);
	        }
	      } else {
	        failures.push([customer['anet_pid'], "Anet Unknown Error"]);
	      }
	    } catch (error) {
	      console.error('Error charging customer:', error);
	      failures.push([customer['anet_pid'], "Anet Unknown Error"]);
	    }
	  }

	  return [successes, failures];
	}

	function handle_input(input) {
	  const USD_REGEX = /^\$?([1-9]{1}[0-9]{0,2}(\,[0-9]{3})*(\.[0-9]{0,2})?|[1-9]{1}[0-9]{0,}(\.[0-9]{0,2})?|0(\.[0-9]{0,2})?|(\.[0-9]{1,2})?)$/;
	  const individual_customer_data = input.split('\n');
	  const customer_data = individual_customer_data.filter(data => data !== "").map(data => data.split('\t'));

	  const anet_pid_to_amount = {};
	  const anet_pids = [];
	  const failed_input = [];

	  for (const customer of customer_data) {
	    if (customer.length >= 1) {
				customer[0] = customer[0].trim()
	      if (customer.length === 2) {
					customer[1] = customer[1].trim()
	        if (Number.isInteger(Number(customer[0]))) {
	          if (!(customer[0] in anet_pid_to_amount)) {
	            if (USD_REGEX.test(customer[1])) {
	              const amount = parseFloat(customer[1].replace('$', '').replace(',', ''));
	              anet_pid_to_amount[customer[0]] = amount;
	            } else {
	              failed_input.push([customer[0], "2nd argument must be a valid dollar amount"]);
	            }
	          } else {
	            failed_input.push([customer[0], "Duplicate authorize.net Profile ID"]);
	          }
	        } else {
	          failed_input.push([customer[0], "1st argument must be a number"]);
	        }
	      } else {
	        failed_input.push([customer[0], "Wrong number of inputs"]);
	      }
	      anet_pids.push(customer[0]);
	    } else {  // len(customer) === 0
	      failed_input.push(["", "Wrong number of inputs"]);
	      anet_pids.push("");
	    }
	  }
		return [anet_pid_to_amount, failed_input, anet_pids];
	}

	function sort_customers_to_charge(customers_to_charge, anet_pids, failed_dynamo) {
	  const failed_dynamo_set = new Set(failed_dynamo);
	  const remaining_anet_pids = anet_pids.filter(anet_pid => !failed_dynamo_set.has(anet_pid));

		const anet_pid_to_idx = {};
		for (let i = 0; i < remaining_anet_pids.length; i++) {
		  const anet_pid = remaining_anet_pids[i];
		  anet_pid_to_idx[anet_pid] = i;
		}

	  const output = new Array(remaining_anet_pids.length);
	  customers_to_charge.forEach(customer => {
      const idx = anet_pid_to_idx[customer['anet_pid']];
      output[idx] = customer;
	  });

	  return output;
	}

	function combine_successes_failures(successes, failures, anet_pids) {
	  let i = 0;
	  let j = 0;
	  const ret = [];
	  for (const anet_pid of anet_pids) {
	    if (i === successes.length || j === failures.length) {
	      break;
	    }

	    if (anet_pid === successes[i][0]) {
	      ret.push(successes[i]);
	      i++;
	    } else {
	      ret.push(failures[j]);
	      j++;
	    }
	  }

	  if (i === successes.length) {
	    ret.push(...failures.slice(j));
	  } else {
	    ret.push(...successes.slice(i));
	  }

	  return ret;
	}

	async function bill_customers() {
		console.log("IN BILL CUSTOMERS")
		const input_data = document.getElementById('input_data').value

		let anet_pid_to_amount, failed_input, anet_pids;
		[anet_pid_to_amount, failed_input, anet_pids] = handle_input(input_data)

	  let customers_to_charge, failed_dynamo;
	  [customers_to_charge, failed_dynamo] = await poll_dynamodb_table(anet_pid_to_amount);

		const sorted_customers_to_charge = sort_customers_to_charge(customers_to_charge, anet_pids, failed_dynamo);

	  let successes, failed_anet;
		console.log("SORTED ", sorted_customers_to_charge)
	  [successes, failed_anet] = await charge_customers(sorted_customers_to_charge);

		try {
			let x = 0
		} catch (e) {
			let y = 0
		}
	}

	return (
		<View className="App">
			<Image src= {logo} className="App-logo"/>
			<Heading level={1} className="UpdateCustomers-header">Bill Customers</Heading>
			<View margin="3rem 0">
				<TextAreaField label="Input Data" id="input_data"/>
				<Button onClick={bill_customers}>Bill Customer</Button>
			</View>
			<Button onClick={signOut}>Sign Out</Button>
			<Button onClick={() => navigate("/update_customers")}>Navigate</Button>
		</View>
	)
}