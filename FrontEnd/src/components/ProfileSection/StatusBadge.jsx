const StatusBadge = ({ progress }) => {
  let className = "status-badge ";
  if (progress === "Completed") className += "completed";
  else if (progress === "In Progress") className += "in-progress";
  else className += "not-started";
  return <span className={className}>{progress}</span>;
};

export default StatusBadge;