// We will just prove that if complaints is an array with our complaint, Assignee.jsx's logic works.
const user = { id: '6a48b93f876d1f2bbafeb23a' };
const complaints = [
  {
    _id: '6a4f27be0feb18b85f245301',
    status: 'Waiting For Acceptance',
    isBroadcast: true,
    broadcastTechnicianIds: ['6a4e44ec8cd245d99cc82e98', '6a48b93f876d1f2bbafeb23a']
  }
];

const assignedComplaints = (complaints || []).filter(c => {
  const uid = user?.id || user?._id;
  return c.assignedTechnicianId === uid || (c.isBroadcast && c.broadcastTechnicianIds?.includes(uid));
});

console.log('User ID:', user.id);
console.log('Complaint broadcastTechnicianIds:', complaints[0].broadcastTechnicianIds);
console.log('Resulting assignedComplaints length:', assignedComplaints.length);
if (assignedComplaints.length > 0) {
  console.log('MATCH!');
} else {
  console.log('FAIL!');
}
