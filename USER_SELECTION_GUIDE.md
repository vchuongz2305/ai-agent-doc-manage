# 👤 HƯỚNG DẪN CHỌN NGƯỜI DÙNG

## 🎯 **TÍNH NĂNG MỚI**

### **✅ TRƯỚC ĐÂY:**
- User phải nhập thủ công: User ID, Department, Email
- Dễ nhầm lẫn và sai sót
- Không có validation

### **🚀 BÂY GIỜ:**
- **Dropdown chọn người dùng** từ danh sách có sẵn
- **Tự động điền** User ID, Department, Email
- **Không thể chỉnh sửa** các field tự động
- **Validation** đầy đủ

---

## 📋 **CÁCH SỬ DỤNG**

### **1️⃣ CHỌN NGƯỜI DÙNG**
```
👤 Chọn người dùng: [Dropdown]
├── -- Chọn người dùng --
├── Nguyễn Văn A (IT)
├── Trần Thị B (HR)  
├── Lê Văn C (Finance)
├── Phạm Thị D (Marketing)
└── Hoàng Văn E (Sales)
```

### **2️⃣ TỰ ĐỘNG ĐIỀN THÔNG TIN**
Khi chọn người dùng, các field sau sẽ **TỰ ĐỘNG** điền:

```
🆔 User ID (tự động): user001          [DISABLED]
🏢 Department (tự động): IT            [DISABLED]  
📧 Sharing Email (tự động): nguyenvana@company.com [DISABLED]
```

### **3️⃣ GỬI TÀI LIỆU**
- Upload file
- Chọn người dùng
- Click "🚀 Process Document"
- Hệ thống tự động gửi với thông tin đã chọn

---

## 🗂️ **CẤU TRÚC DỮ LIỆU**

### **File: `users.json`**
```json
{
  "users": [
    {
      "id": "user001",
      "name": "Nguyễn Văn A", 
      "department": "IT",
      "email": "nguyenvana@company.com",
      "position": "Senior Developer"
    }
  ]
}
```

### **Frontend State:**
```javascript
const [selectedUser, setSelectedUser] = useState('');
const [userId, setUserId] = useState('');
const [department, setDepartment] = useState('');  
const [sharingEmails, setSharingEmails] = useState('');
```

---

## 🔄 **LUỒNG HOẠT ĐỘNG**

### **1️⃣ LOAD USERS**
```javascript
useEffect(() => {
  fetch('/users.json')
    .then(response => response.json())
    .then(data => setUsers(data.users));
}, []);
```

### **2️⃣ USER SELECTION**
```javascript
const handleUserChange = (e) => {
  const selectedUserId = e.target.value;
  setSelectedUser(selectedUserId);
  
  const user = users.find(u => u.id === selectedUserId);
  if (user) {
    setUserId(user.id);           // Tự động điền
    setDepartment(user.department); // Tự động điền  
    setSharingEmails(user.email);   // Tự động điền
  }
};
```

### **3️⃣ FORM SUBMISSION**
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('userId', userId);        // Từ dropdown
formData.append('department', department); // Từ dropdown
formData.append('sharingEmails', sharingEmails); // Từ dropdown
```

---

## 🎨 **STYLING**

### **Disabled Inputs:**
```css
.disabled-input {
  background-color: #f7fafc !important;
  color: #718096 !important;
  cursor: not-allowed !important;
  opacity: 0.8 !important;
}
```

### **Visual States:**
- **Normal**: Trắng, có thể nhập
- **Disabled**: Xám, không thể nhập
- **Hover**: Không có hiệu ứng

---

## 🔧 **BACKEND CHANGES**

### **Static File Serving:**
```javascript
// Serve static files (users.json)
app.use(express.static('.'));
```

### **API Endpoints:**
- `GET /users.json` - Load danh sách users
- `POST /api/document/process` - Process với user info

---

## 📊 **BENEFITS**

### **✅ ƯU ĐIỂM:**
1. **Không lỗi**: Không thể nhập sai thông tin
2. **Nhanh chóng**: Chỉ cần chọn từ dropdown
3. **Consistent**: Thông tin luôn đúng format
4. **User-friendly**: Giao diện trực quan
5. **Maintainable**: Dễ thêm/sửa users

### **🎯 USE CASES:**
- **HR Department**: Chọn nhân viên để gửi tài liệu
- **IT Department**: Chọn developer để share code
- **Finance**: Chọn accountant để gửi báo cáo
- **Marketing**: Chọn team member để chia sẻ campaign

---

## 🚀 **NEXT STEPS**

1. **Thêm users mới** vào `users.json`
2. **Customize departments** theo công ty
3. **Add user roles** và permissions
4. **Integration** với HR system
5. **Bulk operations** cho multiple users
