import React from 'react';
import ReactDOM from 'react-dom/client';
import { MyRoutes } from './Routes'
import { Authenticator } from "@aws-amplify/ui-react";
import './index.css';
import reportWebVitals from './reportWebVitals';

import { Amplify } from 'aws-amplify';
import config from './aws-exports';
Amplify.configure(config);


const root = ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<Authenticator>
  		{({ signOut }) => (
    		<MyRoutes signOut = { signOut }/>
			)}
		</Authenticator>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();