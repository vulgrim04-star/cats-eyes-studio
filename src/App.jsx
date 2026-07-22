import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ThemeEffect from './components/common/ThemeEffect';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Stock from './pages/Stock';
import Finances from './pages/Finances';
import Catalogue from './pages/Catalogue';
import Settings from './pages/Settings';
import Booking from './pages/Booking';

export default function App() {
  return (
    <>
      <ThemeEffect />
      <Routes>
        <Route path="/reservation" element={<Booking />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientDetail />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/parametres" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}
