import "./HeroSection.css";
import axios from "axios";

const HeroSection = () => {
  const userId = "67a6f36d0fefca10b05a1fae"; // or get from your auth context
  const resumeText = `D.Y. Patil College of Engineering - Bachelor of Engineering (AI & DS), Sri Shanishwar Junior College Sonai - Higher Secondary Education (HSC), Dnyaneshwar Vidyalaya Kharwandi - Secondary Education (SSC)
Experience: Web Development Intern at Prodigy Infotech (March 2024 – March 2024, Pune) - Developed responsive and interactive web pages using HTML, CSS, and JavaScript. Performed unit testing and debugging to ensure website functionality across different browsers. Collaborated with designers and developers to optimize user interfaces and enhance user experience.
Relevant Coursework and Technical Skills: Full-Stack Development, RESTful Services, State Management with Redux, API Integration, Debugging, Data Structures and Algorithms, Authentication and Authorization, Responsive Design, Agile Development, Machine Learning, Artificial Intelligence, Natural Language Processing
Programming Languages: JavaScript (Advanced), Python (Basic), C++ (Basic), SQL
Tools and Platforms: Visual Studio Code, Jupyter Notebook, Git, GitHub, Postman, MongoDB Atlas, Vercel, Heroku
Frameworks and Libraries: React.js, Node.js, Express.js, Redux, NumPy, Pandas
Key Skills: AI Implementation, Front-End and Back-End Development, Responsive Design, Problem Solving, Version Control, E-commerce Solutions, Unit Testing
Projects:
  - QuickCart: Developed a full-stack e-commerce platform integrating front-end (React.js) and back-end (Node.js, Express.js) systems. Features include product browsing, shopping cart management, user authentication, and secure payment processing. Implemented a recommendation engine using AI to suggest products based on user behavior. Optimized application performance with RESTful APIs. Deployed the application using Vercel, ensuring responsive and cross-browser compatibility.
  - VidTube: Created a responsive video streaming platform with high-quality playback using React.js and CSS. Implemented seamless navigation with React Router and integrated third-party APIs for real-time video data. Enhanced user engagement with AI-based video recommendations. Ensured accessibility compliance, enhancing usability for all audiences.`;

  const startInterview = async () => {
    try {
      const resp = await axios.post(
        "http://localhost:5000/api/interview/start",
        {
          userId,
          resumeText,
        },
        {
          headers: {
            "Content-Type": "application/json",
            // If your backend expects a JWT token instead of userId, include:
            "x-auth-token":
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2E2ZjM2ZDBmZWZjYTEwYjA1YTFmYWUiLCJpYXQiOjE3NTQ0OTQ2MzZ9.shqp8MOak3OvoYs5DULtQ1XFDVI2B_g6oyMlbYgMjBY    ",
          },
        }
      );

      console.log("Interview start response:", resp.data);

      const audioUrl = resp.data?.audioUrl;
      if (audioUrl) {
        // Normalize to absolute URL (handles '/audio/...' or full URLs)
        const src =
          audioUrl.startsWith("http") || audioUrl.startsWith("https")
            ? audioUrl
            : `http://localhost:5000${audioUrl}`;
        const audio = new Audio(src);
        await audio.play().catch((err) => {
          // play can fail if not user-initiated; but since click started it should work
          console.warn("Audio play failed:", err);
        });
      } else {
        console.warn(
          "No audio URL returned from server. Question text:",
          resp.data?.question
        );
      }
    } catch (error) {
      console.error(
        "Failed to start interview:",
        error?.response?.data || error.message || error
      );
      // Optional: show toast or UI error message here
    }
  };

  return (
    <div className="hero-section">
      <h1>AI Interviewer to Help You Land Your Dream Job</h1>
      <p>Practice AI Interviews for FREE!</p>
      <button onClick={startInterview}>Start Interview now</button>
    </div>
  );
};

export default HeroSection;
