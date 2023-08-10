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
	const BILL_CUSTOMERS_API_ENDPOINT = "https://zuzh8sz21i.execute-api.us-east-2.amazonaws.com/stage1"

	async function poll_dynamodb_table(anet_pid_to_amount) {
		console.log("POLLING DYNAMODB")
		const variables = {
			filter: {
		    or: Object.keys(anet_pid_to_amount).map((anet_pid) => ({ authorize_net_profile_id: { eq: parseInt(anet_pid) }}))
		  }
		}

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
			alert("DynamoDB error")
			return [[], []];
		}
	}

	async function charge_customers(customers_to_charge) {
		console.log("customers: ", customers_to_charge)
		try {
			const session = await Auth.currentSession();
			let idToken = session.idToken.jwtToken
	
			const header = {
				headers: {
					Authorization: `Bearer ${idToken}`
				}
			}
			const requestBody = {
				data: customers_to_charge
			}
			console.log('Request Body: ', requestBody)
			const response = await axios.post(BILL_CUSTOMERS_API_ENDPOINT, requestBody, header)
			console.log('Response: ', response)
	
			var data = response.data;
			console.log('data: ', data)
			if (data.statusCode == 200) {
				var body = JSON.parse(data.body);
				return [body.successes, body.failures]
			} else {
				console.log("API Gateway error")
			}
		} catch (error) {
			console.log(error)
		}
		return [[], []]
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

	function sort_successes_failures(successes, failures, all_keys) {
		// Create a map for successes and failures to quickly look up messages by key
		const successesMap = new Map(successes);
		const failuresMap = new Map(failures);
	
		// Initialize an empty array to store the interleaved result
		const interleavedResult = [];
	
		// Loop through all_keys and add messages from successes or failures to interleavedResult based on their existence in the corresponding maps
		for (const key of all_keys) {
			if (successesMap.has(key)) {
				interleavedResult.push([key, successesMap.get(key)]);
			} else if (failuresMap.has(key)) {
				interleavedResult.push([key, failuresMap.get(key)]);
			}
		}
	
		// Return the interleaved result
		return interleavedResult;
	}

	async function bill_customers() {
		console.log("IN BILL CUSTOMERS")
		const input_data = document.getElementById('input_data').value

		let anet_pid_to_amount, failed_input, anet_pids;
		[anet_pid_to_amount, failed_input, anet_pids] = handle_input(input_data)

	  let customers_to_charge, failed_dynamo;
	  [customers_to_charge, failed_dynamo] = await poll_dynamodb_table(anet_pid_to_amount);
		for (var i = 0; i < failed_dynamo.length; i++) {
			failed_dynamo[i] = [failed_dynamo[i], "Profile ID not found in database"]
		}

	  let successes, failed_anet;
	  [successes, failed_anet] = await charge_customers(customers_to_charge);

		const failures = [...failed_input, ...failed_dynamo, ...failed_anet];
		console.log("Failed ", failures)

	  const output_sorted = sort_successes_failures(successes, failures, anet_pids);
		console.log("OUTPUT SORTED", output_sorted)

		document.getElementById('output_data').value = output_sorted.map(inner_lst => inner_lst[1]).join("\n");
	}

	return (
		<View className="App">
			<Image src= {logo} className="App-logo"/>
			<Heading level={1} className="UpdateCustomers-header">Bill Customers</Heading>
			<View margin="3rem 0">
				<TextAreaField label="Input Data" id="input_data"/>
				<Button onClick={bill_customers}>Bill Customer</Button>
			</View>
			<View margin="3rem 0">
				<TextAreaField label="Output" id="output_data"/>
			</View>
			<Button onClick={signOut}>Sign Out</Button>
			<Button onClick={() => navigate("/update_customers")}>Navigate</Button>
		</View>
	)
}