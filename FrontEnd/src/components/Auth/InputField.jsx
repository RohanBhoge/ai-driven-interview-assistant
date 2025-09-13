const InputField = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id}>{label}</label>
    <input id={id} {...props} />
  </div>
);

export default InputField;
