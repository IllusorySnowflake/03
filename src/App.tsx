import { useStore } from './store/useStore';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NutrientsPage from './pages/NutrientsPage';
import MaterialsPage from './pages/MaterialsPage';
import FormulasPage from './pages/FormulasPage';
import CalculatorPage from './pages/CalculatorPage';

export default function App() {
  const store = useStore();
  const { page, setPage } = store;

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage store={store} setPage={setPage} />;
      case 'nutrients':
        return <NutrientsPage store={store} />;
      case 'materials':
        return <MaterialsPage store={store} />;
      case 'formulas':
        return <FormulasPage store={store} />;
      case 'calculator':
        return <CalculatorPage store={store} />;
      default:
        return <HomePage store={store} setPage={setPage} />;
    }
  };

  return (
    <Layout currentPage={page} setPage={setPage}>
      {renderPage()}
    </Layout>
  );
}
