
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { AddConcept } from './pages/AddConcept';
import { Search } from './pages/Search';
import { KnowledgeDetail } from './pages/KnowledgeDetail';
import { Review } from './pages/Review';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="add" element={<AddConcept />} />
          <Route path="search" element={<Search />} />
          <Route path="knowledge/:id" element={<KnowledgeDetail />} />
          <Route path="review" element={<Review />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
