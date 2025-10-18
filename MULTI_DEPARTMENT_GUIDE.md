# 🏢 HƯỚNG DẪN CHỌN NHIỀU BỘ PHẬN

## 🎯 **TÍNH NĂNG MỚI**

### **✅ TRƯỚC ĐÂY:**
- Chỉ chọn 1 bộ phận
- Reset danh sách khi đổi bộ phận
- Không có nút chọn tất cả

### **🚀 BÂY GIỜ:**
- **Chọn nhiều bộ phận** khác nhau
- **Nút "Chọn tất cả"** cho từng bộ phận
- **Nút "Xóa tất cả"** để reset
- **Hiển thị bộ phận** trong bảng
- **Không reset** khi đổi bộ phận

---

## 🔄 **LUỒNG HOẠT ĐỘNG MỚI**

### **1️⃣ CHỌN BỘ PHẬN**
```
🏢 Chọn bộ phận: [Dropdown]
├── -- Chọn bộ phận --
├── IT
├── HR
└── Finance
```

### **2️⃣ CHỌN NGƯỜI DÙNG**
```
👥 Chọn người dùng từ bộ phận IT:
├── ✅ Chọn tất cả IT          [NÚT MỚI]
├── ➕ Nguyễn Văn A
└── ➕ Trần Văn B
```

### **3️⃣ BẢNG NGƯỜI DÙNG ĐÃ CHỌN**
```
📋 Danh sách người dùng đã chọn (3 người):     🗑️ Xóa tất cả
┌──────────┬─────────┬─────────────┬─────────────────────────┬──────────┐
│ Bộ phận  │   ID    │     Tên     │         Email           │ Thao tác │
├──────────┼─────────┼─────────────┼─────────────────────────┼──────────┤
│   IT     │ user001 │ Nguyễn Văn A│ nguyenvana@company.com  │ ❌ Xóa   │
│   IT     │ user002 │ Trần Văn B  │ tranvanb@company.com    │ ❌ Xóa   │
│   HR     │ user003 │ Lê Thị C    │ lethic@company.com      │ ❌ Xóa   │
└──────────┴─────────┴─────────────┴─────────────────────────┴──────────┘
```

### **4️⃣ EMAIL TỰ ĐỘNG**
```
📧 Sharing Emails (tự động):
nguyenvana@company.com, tranvanb@company.com, lethic@company.com
```

---

## 🎨 **UI COMPONENTS MỚI**

### **Department Actions:**
```jsx
<div className="department-actions">
  <button
    type="button"
    onClick={addAllUsersFromDepartment}
    className="add-all-btn"
    disabled={availableUsers.every(user => 
      selectedUsers.find(u => u.id === user.id)
    )}
  >
    ✅ Chọn tất cả {selectedDepartment}
  </button>
</div>
```

### **Selected Users Header:**
```jsx
<div className="selected-users-header">
  <label>📋 Danh sách người dùng đã chọn ({selectedUsers.length} người):</label>
  <button
    type="button"
    onClick={clearAllUsers}
    className="clear-all-btn"
  >
    🗑️ Xóa tất cả
  </button>
</div>
```

### **Department Badge:**
```jsx
<td className="department-badge">{userDepartment}</td>
```

---

## 🔧 **FUNCTIONS MỚI**

### **Add All Users from Department:**
```javascript
const addAllUsersFromDepartment = () => {
  const newUsers = availableUsers.filter(user => 
    !selectedUsers.find(u => u.id === user.id)
  );
  setSelectedUsers([...selectedUsers, ...newUsers]);
};
```

### **Clear All Users:**
```javascript
const clearAllUsers = () => {
  setSelectedUsers([]);
};
```

### **Get User Department:**
```javascript
const userDepartment = Object.keys(usersByDepartment).find(dept => 
  usersByDepartment[dept].find(u => u.id === user.id)
);
```

---

## 🎨 **STYLING MỚI**

### **Department Actions:**
```css
.department-actions {
  margin: 15px 0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.add-all-btn {
  padding: 12px 20px;
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
}
```

### **Selected Users Header:**
```css
.selected-users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.clear-all-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(245, 101, 101, 0.2);
}
```

### **Department Badge:**
```css
.department-badge {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  display: inline-block;
  min-width: 60px;
}
```

---

## 📊 **VÍ DỤ SỬ DỤNG**

### **Scenario 1: Chọn từ 1 bộ phận**
1. Chọn bộ phận: **IT**
2. Click **"✅ Chọn tất cả IT"**
3. Kết quả: 2 người từ IT được chọn

### **Scenario 2: Chọn từ nhiều bộ phận**
1. Chọn bộ phận: **IT** → Click **"✅ Chọn tất cả IT"**
2. Chọn bộ phận: **HR** → Click **"✅ Chọn tất cả HR"**
3. Chọn bộ phận: **Finance** → Click **"✅ Chọn tất cả Finance"**
4. Kết quả: 6 người từ 3 bộ phận được chọn

### **Scenario 3: Chọn linh hoạt**
1. Chọn bộ phận: **IT** → Click **"✅ Chọn tất cả IT"**
2. Chọn bộ phận: **HR** → Chọn từng người: **Lê Thị C**
3. Chọn bộ phận: **Finance** → Click **"✅ Chọn tất cả Finance"**
4. Kết quả: 4 người (2 IT + 1 HR + 2 Finance)

### **Scenario 4: Xóa và sửa**
1. Chọn nhiều người từ nhiều bộ phận
2. Click **"❌ Xóa"** để xóa từng người
3. Click **"🗑️ Xóa tất cả"** để reset hoàn toàn

---

## 🚀 **BENEFITS**

### **✅ ƯU ĐIỂM:**
1. **Chọn nhiều bộ phận** - Linh hoạt hơn
2. **Nút "Chọn tất cả"** - Nhanh chóng
3. **Nút "Xóa tất cả"** - Dễ reset
4. **Hiển thị bộ phận** - Rõ ràng
5. **Không reset** - Giữ lại lựa chọn

### **🎯 USE CASES:**
- **Cross-department**: Gửi tài liệu cho nhiều bộ phận
- **Bulk selection**: Chọn nhanh toàn bộ bộ phận
- **Flexible selection**: Chọn linh hoạt từng người
- **Easy management**: Dễ quản lý danh sách

---

## 📝 **TECHNICAL DETAILS**

### **State Management:**
```javascript
const [selectedDepartment, setSelectedDepartment] = useState('');
const [selectedUsers, setSelectedUsers] = useState([]);
```

### **Department Selection:**
```javascript
const handleDepartmentChange = (e) => {
  setSelectedDepartment(e.target.value);
  // Don't reset selected users - allow multiple departments
};
```

### **Form Submission:**
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
  "department": "IT", // Bộ phận cuối cùng được chọn
  "sharingEmails": "nguyenvana@company.com, tranvanb@company.com, lethic@company.com",
  "selectedUsers": [
    { "id": "user001", "name": "Nguyễn Văn A", "email": "nguyenvana@company.com" },
    { "id": "user002", "name": "Trần Văn B", "email": "tranvanb@company.com" },
    { "id": "user003", "name": "Lê Thị C", "email": "lethic@company.com" }
  ]
}
```

---

## 🎉 **KẾT QUẢ**

- **✅ Chọn nhiều bộ phận** khác nhau
- **✅ Nút "Chọn tất cả"** cho từng bộ phận
- **✅ Nút "Xóa tất cả"** để reset
- **✅ Hiển thị bộ phận** trong bảng
- **✅ Không reset** khi đổi bộ phận
- **✅ Giao diện đẹp** với gradient và shadow
- **✅ Responsive** trên mọi thiết bị
