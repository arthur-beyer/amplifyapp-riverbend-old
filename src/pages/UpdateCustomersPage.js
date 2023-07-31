import React, { useState } from "react";
import logo from "../riverbend_logo.png";
import "@aws-amplify/ui-react/styles.css";
import { API } from "aws-amplify";
import {
	Button, Flex, Heading, TextField, View, Image, Text, Grid, Alert
} from "@aws-amplify/ui-react";
import { useNavigate } from 'react-router-dom'
import {
	getCustomer as getCustomerQuery,
	listCustomers as listCustomersQuery,
} from "../graphql/queries";
import {
	createCustomer as createCustomerMutation,
	updateCustomer as updateCustomerMutation,
	deleteCustomer as deleteCustomerMutation
} from "../graphql/mutations";
import "./UpdateCustomers.css";
import "../index.css";

export const UpdateCustomersPage = ({ signOut }) => {
	const navigate = useNavigate();
	const [queriedCustomers, setQueriedCustomers] = useState([]);

	async function createOrUpdateCustomer(event) {
		console.log("IN CREATE OR UPDATE CUSTOMER")
    event.preventDefault();
		const form = new FormData(event.target);
		const data = {
      authorize_net_profile_id: form.get("authorize_net_profile_id"),
      authorize_net_payment_profile_id: form.get("authorize_net_payment_profile_id"),
			freshsuite_account_id: form.get("freshsuite_account_id"),
			company_name: form.get("company_name"),
			email: form.get("email"),
			rate: form.get("rate")
    };
		console.log("data ", data)
		try {
			const has_authorize_net_profile_id = await database_contains(data.authorize_net_profile_id)

			if (has_authorize_net_profile_id) {
				await updateCustomer(data)
			} else {
				await createCustomer(data)
			}
			event.target.reset();
		} catch (error) {  // formatting error with user form
			console.log("ERROR: ", error)
			for (var i = 0; i < error.errors.length; i++) {
				alert(error.errors[i].message)
			}
		}
	}

	async function database_contains(authorize_net_profile_id) {
		const result = await API.graphql({
			query: getCustomerQuery,
			variables: { authorize_net_profile_id: authorize_net_profile_id }
		});
		return result.data.getCustomer != null
	}

	async function updateCustomer(data) {
		const result = await API.graphql({
      query: updateCustomerMutation,
      variables: { input: data },
    });
		console.log("update ", result)
	}

  async function createCustomer(data) {
    const result = await API.graphql({
      query: createCustomerMutation,
      variables: { input: data },
    });
		console.log("create ", result)
  }

	async function findCustomer(event) {
		console.log("IN FIND CUSTOMER")
		event.preventDefault();
		const form = new FormData(event.target);
		const data = {
      authorize_net_profile_id: form.get("authorize_net_profile_id"),
      authorize_net_payment_profile_id: form.get("authorize_net_payment_profile_id"),
			freshsuite_account_id: form.get("freshsuite_account_id"),
			company_name: form.get("company_name"),
			email: form.get("email"),
    };

		// user should only search on one search field
		var non_empty_field = ""
		for (var i = 0; i < Object.keys(data).length; i++) {
			var key = Object.keys(data)[i]
			if (data[key] != "") {
				if (non_empty_field != "") {
					non_empty_field = ""
					break
				}
				non_empty_field = key
			}
		}
		if (non_empty_field == "") {
			alert("ERROR: enter exactly one search field")
			return
		}

		const variables = {
		  filter: {
		    [non_empty_field]: {
		      eq: data[non_empty_field]
		    }
		  }
		};

		try {
			const result = await API.graphql({
			  query: listCustomersQuery, variables: variables
			});
			console.log(result)
			setQueriedCustomers(result.data.listCustomers.items)
			event.target.reset();
		} catch (error) {  // formatting error with user form
			console.log("ERROR: ", error)
			for (var i = 0; i < error.errors.length; i++) {
				alert(error.errors[i].message)
			}
		}
	}

	async function deleteCustomer({ authorize_net_profile_id }) {
		const newCustomers = queriedCustomers.filter((customer) =>
			customer.authorize_net_profile_id !== authorize_net_profile_id);
    setQueriedCustomers(newCustomers);

		const has_authorize_net_profile_id = await database_contains(authorize_net_profile_id)

		if (has_authorize_net_profile_id) {
			const result = await API.graphql({
	      query: deleteCustomerMutation,
	      variables: { input: { authorize_net_profile_id } },
	    });
			console.log("delete success", result)
		}
	}

  return (
    <View className="App">
			<Image src= {logo} className="App-logo"/>
      <Heading level={1} className="UpdateCustomers-header">Create or Update Customer</Heading>
      <View as="form" margin="3rem 0" onSubmit={createOrUpdateCustomer}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="authorize_net_profile_id" variation="quiet" required
						label="Authorize.net profile ID" />
          <TextField
            name="authorize_net_payment_profile_id" variation="quiet" required
            label="Authorize.net payment profile ID" />
					<TextField
            name="freshsuite_account_id" variation="quiet" required
            label="Freshsuite Account ID" />
					</Flex>
					<Flex direction="row" justifyContent="center">
          <TextField
            name="company_name" label="Company Name" variation="quiet" required />
					<TextField
            name="email" label="Company email" variation="quiet" required />
          <TextField
            name="rate" label="Company billing rate" variation="quiet" required />
				</Flex>
	      <Button type="submit" variation="primary">Create Customer</Button>
      </View>

			<Heading level={2} className="UpdateCustomers-header">Find Customers</Heading>
      <View as="form" margin="3rem 0" onSubmit={findCustomer}>
        <Flex direction="row" justifyContent="center">
          <TextField name="authorize_net_profile_id" variation="quiet"
						label="Authorize.net profile ID" />
          <TextField name="authorize_net_payment_profile_id" variation="quiet"
            label="Authorize.net payment profile ID" />
					<TextField name="freshsuite_account_id" variation="quiet"
						label="Freshsuite Account ID" />
					</Flex>

				<Flex direction="row" justifyContent="center">
          <TextField name="company_name" label="Company Name" variation="quiet" />
					<TextField name="email" label="Company email" variation="quiet" />
				</Flex>
	      <Button type="submit" variation="primary">Find Customer</Button>

				<Grid columnGap="0.5rem" rowGap="0.5rem" templateColumns="1fr 1fr 1fr 1fr 1fr 1fr">
				<Text fontWeight={700}>Authorize.net Profile ID</Text>
				<Text fontWeight={700}>Authorize.net Payment Profile ID</Text>
				<Text fontWeight={700}>Freshsuite Account ID</Text>
				<Text fontWeight={700}>Company Name</Text>
				<Text fontWeight={700}>Company Email</Text>
				<Text fontWeight={700}></Text>
					{queriedCustomers.map((customer) => (
						<>
	            <Text>{customer.authorize_net_profile_id}</Text>
							<Text>{customer.authorize_net_payment_profile_id}</Text>
							<Text>{customer.freshsuite_account_id}</Text>
							<Text>{customer.company_name}</Text>
							<Text>{customer.email}</Text>
	            <Button variation="link" onClick={() => deleteCustomer(customer)}>
	              Delete Customer
	            </Button>
						</>
	        ))}
				</Grid>
      </View>

      <Button onClick={signOut}>Sign Out</Button>
			<Button onClick={() => navigate("/bill_customers")}>Navigate</Button>
    </View>
  );
};