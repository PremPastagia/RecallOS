
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { AddConcept } from './pages/AddConcept';
import { Search } from './pages/Search';
import { KnowledgeDetail } from './pages/KnowledgeDetail';
import { Review } from './pages/Review';
import { Connections } from './pages/Connections';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Vault } from './pages/Vault';
import { Heatmap } from './pages/Heatmap';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="add" element={<AddConcept />} />
              <Route path="search" element={<Search />} />
              <Route path="knowledge/:id" element={<KnowledgeDetail />} />
              <Route path="connections" element={<Connections />} />
              <Route path="review" element={<Review />} />
              <Route path="vault" element={<Vault />} />
              <Route path="heatmap" element={<Heatmap />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
