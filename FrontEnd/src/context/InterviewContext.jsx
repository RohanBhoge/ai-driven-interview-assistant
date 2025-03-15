import { createContext, useState, useContext } from "react";

const InterviewContext = createContext();

export const InterviewProvider = ({ children }) => {
  const [text, setText] = useState(localStorage.getItem("text") || "");

  return (
    <InterviewContext.Provider value={{ text, setText }}>
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => useContext(InterviewContext);
