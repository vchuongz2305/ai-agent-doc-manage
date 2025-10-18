# 📋 HƯỚNG DẪN BẢNG NGƯỜI DÙNG

## 🎯 **TÍNH NĂNG MỚI**

### **✅ TRƯỚC ĐÂY:**
- Dropdown chọn 1 người dùng
- Tự động điền thông tin
- Không thể chọn nhiều người

### **🚀 BÂY GIỜ:**
- **Chọn theo bộ phận** (IT, HR, Finance)
- **Bảng người dùng** với khả năng thêm/xóa
- **Nhiều người dùng** cùng lúc
- **Tự động tạo email list**

---

## 📊 **CẤU TRÚC DỮ LIỆU**

### **Users by Department:**
```javascript
const usersByDepartment = {
  'IT': [
    { id: 'user001', name: 'Nguyễn Văn A', email: 'nguyenvana@company.com' },
    { id: 'user002', name: 'Trần Văn B', email: 'tranvanb@company.com' }
  ],
  'HR': [
    { id: 'user003', name: 'Lê Thị C', email: 'lethic@company.com' },
    { id: 'user004', name: 'Phạm Văn D', email: 'phamvand@company.com' }
  ],
  'Finance': [
    { id: 'user005', name: 'Hoàng Thị E', email: 'hoangthie@company.com' },
    { id: 'user006', name: 'Vũ Văn F', email: 'vuvanf@company.com' }
  ]
};
```

---

## 🔄 **LUỒNG HOẠT ĐỘNG**

### **1️⃣ CHỌN BỘ PHẬN**
```
🏢 Chọn bộ phận: [Dropdown]
├── -- Chọn bộ phận --
├── IT
├── HR
└── Finance
```

### **2️⃣ CHỌN NGƯỜI DÙNG**
Khi chọn bộ phận, hiển thị danh sách người dùng:

```
👥 Chọn người dùng từ bộ phận IT:
├── ➕ Nguyễn Văn A
└── ➕ Trần Văn B
```

### **3️⃣ BẢNG NGƯỜI DÙNG ĐÃ CHỌN**
```
📋 Danh sách người dùng đã chọn:
┌─────────┬─────────────┬─────────────────────────┬──────────┐
│   ID    │     Tên     │         Email           │ Thao tác │
├─────────┼─────────────┼─────────────────────────┼──────────┤
│ user001 │ Nguyễn Văn A│ nguyenvana@company.com  │ ❌ Xóa   │
│ user002 │ Trần Văn B  │ tranvanb@company.com    │ ❌ Xóa   │
└─────────┴─────────────┴─────────────────────────┴──────────┘
```

### **4️⃣ EMAIL TỰ ĐỘNG**
```
📧 Sharing Emails (tự động):
nguyenvana@company.com, tranvanb@company.com
```

---

## 🎨 **UI COMPONENTS**

### **Department Selection:**
```jsx
<select 
  value={selectedDepartment}
  onChange={handleDepartmentChange}
>
  <option value="">-- Chọn bộ phận --</option>
  <option value="IT">IT</option>
  <option value="HR">HR</option>
  <option value="Finance">Finance</option>
</select>
```

### **User Selection Buttons:**
```jsx
{availableUsers.map(user => (
  <button
    onClick={() => addUser(user)}
    disabled={selectedUsers.find(u => u.id === user.id)}
  >
    ➕ {user.name}
  </button>
))}
```

### **Selected Users Table:**
```jsx
<table>
  <thead>
    <tr>
      <th>ID</th>
      <th>Tên</th>
      <th>Email</th>
      <th>Thao tác</th>
    </tr>
  </thead>
  <tbody>
    {selectedUsers.map(user => (
      <tr key={user.id}>
        <td>{user.id}</td>
        <td>{user.name}</td>
        <td>{user.email}</td>
        <td>
          <button onClick={() => removeUser(user.id)}>
            ❌ Xóa
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 🔧 **FUNCTIONS**

### **Add User:**
```javascript
const addUser = (user) => {
  if (!selectedUsers.find(u => u.id === user.id)) {
    setSelectedUsers([...selectedUsers, user]);
  }
};
```

### **Remove User:**
```javascript
const removeUser = (userId) => {
  setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
};
```

### **Auto Update Emails:**
```javascript
useEffect(() => {
  const emails = selectedUsers.map(user => user.email).join(', ');
  setSharingEmails(emails);
}, [selectedUsers]);
```

---

## 📤 **FORM SUBMISSION**

### **Form Data:**
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('department', selectedDepartment);
formData.append('sharingEmails', sharingEmails);
formData.append('selectedUsers', JSON.stringify(selectedUsers));
```

### **Backend Processing:**
```javascript
// Backend nhận:
{
  "file": "document.pdf",
  "department": "IT",
  "sharingEmails": "nguyenvana@company.com, tranvanb@company.com",
  "selectedUsers": [
    { "id": "user001", "name": "Nguyễn Văn A", "email": "nguyenvana@company.com" },
    { "id": "user002", "name": "Trần Văn B", "email": "tranvanb@company.com" }
  ]
}
```

---

## 🎨 **STYLING**

### **User Selection:**
```css
.user-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.add-user-btn {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
}
```

### **Selected Users Table:**
```css
.selected-users-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selected-users-table th {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
```

---

## 🚀 **BENEFITS**

### **✅ ƯU ĐIỂM:**
1. **Chọn theo bộ phận** - Dễ tìm người dùng
2. **Bảng trực quan** - Xem rõ danh sách
3. **Thêm/xóa linh hoạt** - Dễ quản lý
4. **Email tự động** - Không cần nhập thủ công
5. **Nhiều người dùng** - Gửi cho nhiều người cùng lúc

### **🎯 USE CASES:**
- **IT Department**: Gửi tài liệu cho team IT
- **HR Department**: Chia sẻ policy cho nhân viên
- **Finance**: Gửi báo cáo cho team Finance
- **Cross-department**: Chọn từ nhiều bộ phận

---

## 📝 **VÍ DỤ SỬ DỤNG**

### **Scenario 1: Gửi tài liệu cho team IT**
1. Chọn bộ phận: **IT**
2. Chọn người dùng: **Nguyễn Văn A**, **Trần Văn B**
3. Upload file: **Technical_Spec.pdf**
4. Submit → Gửi cho 2 người IT

### **Scenario 2: Gửi báo cáo cho team Finance**
1. Chọn bộ phận: **Finance**
2. Chọn người dùng: **Hoàng Thị E**, **Vũ Văn F**
3. Upload file: **Monthly_Report.pdf**
4. Submit → Gửi cho 2 người Finance

### **Scenario 3: Gửi cho nhiều bộ phận**
1. Chọn bộ phận: **IT** → Chọn **Nguyễn Văn A**
2. Chọn bộ phận: **HR** → Chọn **Lê Thị C**
3. Upload file: **Company_Policy.pdf**
4. Submit → Gửi cho 2 người từ 2 bộ phận khác nhau
