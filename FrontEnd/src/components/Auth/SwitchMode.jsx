const SwitchMode = ({ isLoginMode, switchModeHandler }) => (
  <div className="switch-mode">
    <p>
      {isLoginMode ? "Don't have an account?" : "Already have an account?"}
      <span onClick={switchModeHandler}>
        {isLoginMode ? "Sign Up" : "Login"}
      </span>
    </p>
  </div>
);

export default SwitchMode;