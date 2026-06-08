import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllEmployees, deleteEmployee } from '../services/api';

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await getAllEmployees();
      setEmployees(response.data);
    } catch (error) {
      showToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id);
      setEmployees(employees.filter(emp => emp.id !== id));
      showToast('Employee deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete employee', 'error');
    }
    setDeleteDialog(null);
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totalSalary = employees.reduce((sum, emp) => sum + emp.salary, 0);
  const departments = [...new Set(employees.map(emp => emp.department))];

  if (loading) {
    return (
      <div className="container">
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-subtitle">Manage your team members and their details</p>
        </div>
        <Link to="/add" className="btn btn-primary">➕ Add Employee</Link>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div>
            <div className="stat-value">{employees.length}</div>
            <div className="stat-label">Total Employees</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div>
            <div className="stat-value">${totalSalary.toLocaleString()}</div>
            <div className="stat-label">Total Payroll</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">🏢</div>
          <div>
            <div className="stat-value">{departments.length}</div>
            <div className="stat-label">Departments</div>
          </div>
        </div>
      </div>

      {/* Table */}
      {employees.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No employees yet</div>
            <div className="empty-text">Get started by adding your first team member</div>
            <Link to="/add" className="btn btn-primary">➕ Add Employee</Link>
          </div>
        </div>
      ) : (
        <div className="glass-card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="employee-name">{emp.firstName} {emp.lastName}</div>
                      <div className="employee-email">{emp.email}</div>
                    </td>
                    <td><span className="department-badge">{emp.department}</span></td>
                    <td><span className="salary">${emp.salary.toLocaleString()}</span></td>
                    <td>
                      <div className="actions">
                        <Link to={`/edit/${emp.id}`} className="btn btn-ghost btn-sm">✏️ Edit</Link>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteDialog(emp)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteDialog && (
        <div className="dialog-overlay" onClick={() => setDeleteDialog(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Delete Employee?</div>
            <div className="dialog-message">
              Are you sure you want to delete <strong>{deleteDialog.firstName} {deleteDialog.lastName}</strong>? This cannot be undone.
            </div>
            <div className="dialog-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteDialog(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteDialog.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default EmployeeList;
