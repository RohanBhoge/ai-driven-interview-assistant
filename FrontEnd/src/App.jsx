import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
// import Navbar from "./components/Navbar";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload-resume" element={<UploadResume />} />
        <Route path="/view-questions" element={<ViewQuestions />} /> */}
      </Routes>
    </>
  );
}

export default App;
