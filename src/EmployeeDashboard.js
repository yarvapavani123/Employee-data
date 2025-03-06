import React, { useState, useEffect, useCallback } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import { ModuleRegistry } from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { Button, Input, Select, Switch, Modal, Form, InputNumber, message } from "antd";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import localforage from "localforage";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const { Option } = Select;

const EmployeeDashboard = () => {
  const [rowData, setRowData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    localforage.getItem("employees").then((data) => {
      if (data) {
        setRowData(data);
      } else {
        const dummyData = generateDummyData();
        setRowData(dummyData);
        localforage.setItem("employees", dummyData);
      }
    });
  }, []);

  useEffect(() => {
    applyFilters();
  }, [rowData, searchText, departmentFilter, statusFilter]);

  const generateDummyData = () => [
    { id: 1, name: "Alice", department: "HR", role: "Manager", salary: 60000, status: true },
    { id: 2, name: "Bob", department: "Engineering", role: "Developer", salary: 75000, status: true },
    { id: 3, name: "Charlie", department: "Marketing", role: "Analyst", salary: 55000, status: false },
  ];

  const applyFilters = useCallback(() => {
    let data = [...rowData];
    if (searchText) {
      data = data.filter((emp) => emp.name.toLowerCase().includes(searchText.toLowerCase()));
    }
    if (departmentFilter) {
      data = data.filter((emp) => emp.department === departmentFilter);
    }
    if (statusFilter !== null) {
      data = data.filter((emp) => emp.status === statusFilter);
    }
    setFilteredData(data);
  }, [rowData, searchText, departmentFilter, statusFilter]);

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsEditing(true);
    setIsModalVisible(true);
    form.setFieldsValue(employee);
  };

  const confirmDelete = (employee) => {
    setDeleteEmployee(employee);
    setIsDeleteModalVisible(true);
  };

  const handleDelete = () => {
    const updatedData = rowData.filter((emp) => emp.id !== deleteEmployee.id);
    setRowData(updatedData);
    localforage.setItem("employees", updatedData);
    setIsDeleteModalVisible(false);
    message.success(`${deleteEmployee.name} has been deleted!`);
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setIsEditing(false);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      let updatedData;
      if (isEditing) {
        updatedData = rowData.map((emp) =>
          emp.id === editingEmployee.id ? { ...editingEmployee, ...values } : emp
        );
      } else {
        const newEmployee = { id: rowData.length + 1, ...values };
        updatedData = [...rowData, newEmployee];
      }
      setRowData(updatedData);
      localforage.setItem("employees", updatedData);
      setIsModalVisible(false);
      message.success(isEditing ? "Employee updated!" : "Employee added!");
    });
  };

  const handleExportCSV = () => {
    const csvRows = [];
    const headers = ["Employee ID", "Name", "Department", "Role", "Salary", "Status"];
    csvRows.push(headers.join(","));
    
    filteredData.forEach((row) => {
      const values = [
        row.id,
        row.name,
        row.department,
        row.role,
        row.salary,
        row.status ? "Active" : "Inactive"
      ];
      csvRows.push(values.join(","));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employees.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columnDefs = [
    { headerName: "Employee ID", field: "id", sortable: true, filter: true, width: 150 },
    { headerName: "Name", field: "name", sortable: true, filter: true },
    { headerName: "Department", field: "department", sortable: true, filter: true },
    { headerName: "Role", field: "role", sortable: true, filter: true },
    { headerName: "Salary", field: "salary", sortable: true, filter: true },
    {
      headerName: "Status",
      field: "status",
      cellRenderer: ({ value }) => (value ? "Active" : "Inactive"),
      width: 100,
    },
    {
      headerName: "Actions",
      field: "actions",
      cellRenderer: (params) =>
        params.data ? (
          <>
            <Button type="link" onClick={() => handleEdit(params.data)}>Edit</Button>
            <Button type="link" danger onClick={() => confirmDelete(params.data)}>Delete</Button>
          </>
        ) : null,
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: "crimson", fontSize: "30px", marginTop: "-5px", marginBottom: "30px" }}>
        Employee Management Dashboard
      </h2>
      <div style={{ marginBottom: 17, display: "flex", gap: 20 }}>
        <Input
          placeholder="Search by name"
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 250 }}
        />
        <Select
          placeholder="Filter by Department"
          onChange={(value) => setDepartmentFilter(value)}
          style={{ width: 200 }}
        >
          <Option value="">All</Option>
          <Option value="HR">HR</Option>
          <Option value="Engineering">Engineering</Option>
          <Option value="Marketing">Marketing</Option>
        </Select>
        <Switch
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          onChange={(checked) => setStatusFilter(checked)}
        />
        <Button type="primary" onClick={handleAddEmployee}>Add Employee</Button>
        <Button onClick={handleExportCSV}>Export CSV</Button>
      </div>
      <div className="ag-theme-alpine" style={{ height: 500, width: "100%" }}>
        <AgGridReact
          rowData={filteredData}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={10}
        />
      </div>
  
      {/* Modal for Adding and Editing Employee */}
      <Modal
        title={isEditing ? "Edit Employee" : "Add Employee"}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSave}
        okText={isEditing ? "Update" : "Add"}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Please enter employee name" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="department"
            label="Department"
            rules={[{ required: true, message: "Please select a department" }]}
          >
            <Select>
              <Option value="HR">HR</Option>
              <Option value="Engineering">Engineering</Option>
              <Option value="Marketing">Marketing</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please enter employee role" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="salary"
            label="Salary"
            rules={[{ required: true, message: "Please enter salary" }]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
  
      {/* Delete Confirmation Modal */}
      <Modal
        title="Confirm Delete"
        visible={isDeleteModalVisible}
        onCancel={() => setIsDeleteModalVisible(false)}
        onOk={handleDelete}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete {deleteEmployee?.name}?</p>
      </Modal>
    </div>
  );
  
};

export default EmployeeDashboard;