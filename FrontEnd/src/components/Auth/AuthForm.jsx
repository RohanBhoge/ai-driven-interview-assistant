import InputField from "./InputField";

const AuthForm = ({
  isLoginMode,
  isLoading,
  formData,
  handleChange,
  handleSubmit,
}) => {
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {!isLoginMode && (
        <InputField
          type="text"
          id="name"
          label="Name"
          placeholder="Enter your name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      )}
      <InputField
        type="email"
        id="email"
        label="Email"
        placeholder="Enter your email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <InputField
        type="password"
        id="password"
        label="Password"
        placeholder="Enter your password"
        value={formData.password}
        onChange={handleChange}
        minLength={6}
        required
      />
      {!isLoginMode && (
        <InputField
          type="password"
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
      )}
      <button type="submit" className="auth-button" disabled={isLoading}>
        {isLoading ? "Sending..." : isLoginMode ? "Login" : "Sign Up"}
      </button>
    </form>
  );
};

export default AuthForm;
