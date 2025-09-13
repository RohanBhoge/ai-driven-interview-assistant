const ProfileDetails = ({ user }) => (
  <div className="profile-details">
    <p>
      <strong>Name:</strong> {user.name}
    </p>
    <p>
      <strong>Email:</strong> {user.email}
    </p>
  </div>
);

export default ProfileDetails;