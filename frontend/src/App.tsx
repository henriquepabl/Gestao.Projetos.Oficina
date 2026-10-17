import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/DashBoard";
import { EmConstrucao } from "./pages/EmConstrucao";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/clientes"
            element={<EmConstrucao titulo="Clientes" />}
          />
          <Route
            path="/agendamentos"
            element={<EmConstrucao titulo="Agendamentos" />}
          />
          <Route
            path="/ordens-servico"
            element={<EmConstrucao titulo="Ordens de serviço" />}
          />
          <Route
            path="/estoque"
            element={<EmConstrucao titulo="Estoque" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;