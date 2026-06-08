import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createEmployee, getEmployeeById, updateEmployee } from '../services/api';

function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    salary: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isEdit) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const response = await getEmployeeById(id);
      setForm(response.data);
    } catch (error) {
      showToast('Employee not found', 'error');
      navigate('/');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
    if (!form.department.trim()) newErrors.department = 'Department is required';
    if (!form.salary) newErrors.salary = 'Salary is required';
    else if (Number(form.salary) <= 0) newErrors.salary = 'Salary must be positive';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = { ...form, salary: Number(form.salary) };
      if (isEdit) {
        await updateEmployee(id, payload);
      } else {
        await createEmployee(payload);
      }
      navigate('/');
    } catch (error) {
      const msg = error.response?.data?.message || 'Something went wrong';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="container fade-in">
      <div className="form-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">{isEdit ? '✏️ Edit Employee' : '➕ Add Employee'}</h1>
            <p className="page-subtitle">
              {isEdit ? 'Update employee information' : 'Fill in the details to add a new team member'}
            </p>
          </div>
        </div>

        <div className="form-card slide-in">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  className={`form-input ${errors.firstName ? 'error' : ''}`}
                  placeholder="John"
                  value={form.firstName}
                  onChange={handleChange}
                />
                {errors.firstName && <span className="form-error">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  className={`form-input ${errors.lastName ? 'error' : ''}`}
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={handleChange}
                />
                {errors.lastName && <span className="form-error">{errors.lastName}</span>}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="john.doe@company.com"
                  value={form.email}
                  onChange={handleChange}
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  name="department"
                  className={`form-input ${errors.department ? 'error' : ''}`}
                  placeholder="Engineering"
                  value={form.department}
                  onChange={handleChange}
                />
                {errors.department && <span className="form-error">{errors.department}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Salary ($)</label>
                <input
                  type="number"
                  name="salary"
                  className={`form-input ${errors.salary ? 'error' : ''}`}
                  placeholder="75000"
                  value={form.salary}
                  onChange={handleChange}
                />
                {errors.salary && <span className="form-error">{errors.salary}</span>}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '⏳ Saving...' : isEdit ? '💾 Update' : '➕ Create'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default EmployeeForm;
