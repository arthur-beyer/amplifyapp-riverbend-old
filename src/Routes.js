import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { UpdateCustomersPage } from './pages/UpdateCustomersPage'
import { BillCustomersPage } from './pages/BillCustomersPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const MyRoutes = ({ signOut }) => {
	return (
		<Router>
			<Routes>
				<Route path='/' element= { <Navigate to='/update_customers' replace={true}/> } exact/>
				<Route path='/update_customers' element= { <UpdateCustomersPage signOut={ signOut }/> } exact/>
				<Route path='/bill_customers' element= { <BillCustomersPage signOut={ signOut }/> } />
				<Route path='*' element= { <NotFoundPage /> } />
			</Routes>
		</Router>
	);
}