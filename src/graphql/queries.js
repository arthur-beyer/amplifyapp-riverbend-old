/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getCustomer = /* GraphQL */ `
  query GetCustomer($authorize_net_profile_id: ID!) {
    getCustomer(authorize_net_profile_id: $authorize_net_profile_id) {
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
export const listCustomers = /* GraphQL */ `
  query ListCustomers(
    $authorize_net_profile_id: ID
    $filter: ModelCustomerFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listCustomers(
      authorize_net_profile_id: $authorize_net_profile_id
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
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
      nextToken
      __typename
    }
  }
`;
