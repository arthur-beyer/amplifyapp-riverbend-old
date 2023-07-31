/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createCustomer = /* GraphQL */ `
  mutation CreateCustomer(
    $input: CreateCustomerInput!
    $condition: ModelCustomerConditionInput
  ) {
    createCustomer(input: $input, condition: $condition) {
      authorize_net_profile_id
      authorize_net_payment_profile_id
      freshsuite_account_id
      company_name
      email
      rate
      fname
      lname
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateCustomer = /* GraphQL */ `
  mutation UpdateCustomer(
    $input: UpdateCustomerInput!
    $condition: ModelCustomerConditionInput
  ) {
    updateCustomer(input: $input, condition: $condition) {
      authorize_net_profile_id
      authorize_net_payment_profile_id
      freshsuite_account_id
      company_name
      email
      rate
      fname
      lname
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteCustomer = /* GraphQL */ `
  mutation DeleteCustomer(
    $input: DeleteCustomerInput!
    $condition: ModelCustomerConditionInput
  ) {
    deleteCustomer(input: $input, condition: $condition) {
      authorize_net_profile_id
      authorize_net_payment_profile_id
      freshsuite_account_id
      company_name
      email
      rate
      fname
      lname
      createdAt
      updatedAt
      __typename
    }
  }
`;
