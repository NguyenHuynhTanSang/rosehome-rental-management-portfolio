import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router";

import HomePage
  from "@/pages/HomePage";

import RoomDetailPage
  from "@/pages/RoomDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/rooms/:roomCode"
          element={<RoomDetailPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;