import React, { useEffect, useState } from "react";
import { LayoutDashboard, CheckCircle, Clock, ChefHat, Truck, LogOut, RefreshCw, User, MapPin, Phone, Loader2, X, Check, Menu as MenuIcon, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

const API = "https://script.google.com/macros/s/AKfycbyLQIK0KYvhB835sVQhwbB9_fuYWxr_hb7-A-heuVUC6X77NYa8H_bPyIPqi2cve1U/exec";

export default function App() {
  const [token, setToken] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [form, setForm] = useState({ email: "", password: "" });

  // --- NEW MENU STATE ---
  const [activeTab, setActiveTab] = useState("orders"); // "orders" or "menu"
  const [menuItems, setMenuItems] = useState([]);
  const [isFetchingMenu, setIsFetchingMenu] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isSubmittingMenu, setIsSubmittingMenu] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: "", description: "", price: "", category: "", image: "" });
  
  // Loading states for individual buttons
  const [actionLoading, setActionLoading] = useState(null); 
  // ----------------------

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const login = async (e) => {
    if (e) e.preventDefault();
    if (!form.email || !form.password) {
      showToast("Enter email and password", "error");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "LOGIN",
          email: form.email,
          password: form.password
        })
      });

      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        showToast("Login successful");
      } else {
        showToast("Invalid credentials", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Login failed", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch(API + "?type=orders&token=" + token);
      const data = await res.json();

      if (data.error === "Unauthorized") {
        setToken(null);
        showToast("Session expired", "error");
        return;
      }

      const grouped = {};
      data.forEach((row, index) => {
        if (!row.orderId) return; 
        
        if (!grouped[row.orderId]) {
          grouped[row.orderId] = {
            orderId: row.orderId,
            time: row.time,
            name: row.name,
            phone: row.phone,
            address: row.address,
            total: row.total,
            status: row.status, 
            items: []
          };
        }
        grouped[row.orderId].items.push({ name: row.item, price: row.price, originalIndex: index });
      });

      const sortedOrders = Object.values(grouped).sort((a, b) => new Date(b.time) - new Date(a.time));
      setOrders(sortedOrders);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchMenu = async () => {
    setIsFetchingMenu(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      setMenuItems(data || []);
    } catch (err) {
      console.error("Fetch menu error", err);
      showToast("Failed to load menu", "error");
    } finally {
      setIsFetchingMenu(false);
    }
  };

  const handleAddMenu = async (e) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price) {
      showToast("Name and price are required", "error");
      return;
    }

    setIsSubmittingMenu(true);
    try {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "ADD_MENU",
          token,
          data: menuForm
        })
      });
      
      showToast("Menu item added successfully!");
      setIsMenuModalOpen(false);
      setMenuForm({ name: "", description: "", price: "", category: "", image: "" });
      fetchMenu();
    } catch (err) {
      console.error(err);
      showToast("Failed to add item", "error");
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (!menuId) {
      showToast("Error: Item ID missing in Google Sheet. Add an ID to column A.", "error");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    
    setActionLoading(`delete-${menuId}`);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "DELETE_MENU", token, menuId: String(menuId) }) 
      });
      
      const responseText = await res.text();
      
      // Check EXACTLY what the Google Script replied with
      if (responseText === "Deleted") {
        showToast("Item deleted successfully");
        fetchMenu();
      } else {
        throw new Error(responseText); // Forces it into the catch block below
      }
    } catch (err) {
      console.error("Delete Error:", err);
      if (err.message.includes("Not Found")) {
        showToast("Failed: ID not found in Google Sheet. Check Column A.", "error");
      } else {
        showToast("Failed: Did you deploy the Script as a NEW VERSION?", "error");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleMenu = async (menuId) => {
    if (!menuId) {
      showToast("Error: Item ID missing in Google Sheet", "error");
      return;
    }

    setActionLoading(`toggle-${menuId}`);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "TOGGLE_MENU", token, menuId: String(menuId) }) 
      });
      
      const responseText = await res.text();
      
      if (responseText === "Toggled") {
        showToast("Status updated");
        fetchMenu();
      } else {
        throw new Error(responseText);
      }
    } catch (err) {
      console.error("Toggle Error:", err);
      showToast("Failed to update status. Check script deployment.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    setIsFetching(true);
    fetchOrders();
    fetchMenu();
    
    const intervalId = setInterval(fetchOrders, 5000);
    return () => clearInterval(intervalId);
  }, [token]);

  const updateStatus = async (order, newStatus) => {
    setUpdatingId(order.orderId);
    try {
      const updatePromises = order.items.map(item => 
        fetch(API, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "UPDATE_STATUS",
            token,
            index: item.originalIndex,
            status: newStatus
          })
        })
      );

      await Promise.all(updatePromises);
      showToast(`Order marked as ${newStatus}`);
      fetchOrders(); 
    } catch (err) {
      console.error(err);
      showToast("Failed to update order", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "New": return "bg-pink-100 text-pink-700 border-pink-200";
      case "Preparing": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Ready": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Delivered": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
          <div className="bg-slate-800 p-8 text-center text-white">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <LayoutDashboard size={32} />
            </div>
            <h1 className="text-2xl font-bold">Admin Portal</h1>
            <p className="text-slate-400 text-sm mt-1">Manage orders and restaurant operations</p>
          </div>
          
          <form onSubmit={login} className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <input 
                type="email" 
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="admin@gmail.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2 mt-4"
            >
              {isLoggingIn ? <><Loader2 size={20} className="animate-spin" /> Authenticating...</> : "Sign In to Dashboard"}
            </button>
          </form>
        </div>
        
        {toast.show && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 ${toast.type === "error" ? "bg-red-500 text-white" : "bg-slate-800 text-white"}`}>
            {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "Delivered");
  const pastOrders = orders.filter(o => o.status === "Delivered");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <nav className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-lg text-white">
                <LayoutDashboard size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-tight hidden sm:block">QuickBite Admin</h1>
                {activeTab === 'orders' && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Sync
                  </div>
                )}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'orders' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
              >
                Orders
              </button>
              <button 
                onClick={() => setActiveTab('menu')}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'menu' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
              >
                Menu Items
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { 
                if (activeTab === 'orders') fetchOrders(); 
                else fetchMenu(); 
                showToast("Refreshed"); 
              }}
              className="text-slate-300 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
              title="Manual Refresh"
            >
              <RefreshCw size={20} className={isFetching || isFetchingMenu ? "animate-spin" : ""} />
            </button>
            <div className="h-6 w-px bg-slate-700"></div>
            <button 
              onClick={() => setToken(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-red-400 transition-colors px-2 py-1"
            >
              <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="sm:hidden flex bg-slate-900 border-t border-slate-800 p-2">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'orders' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
        >
          Orders
        </button>
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'menu' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
        >
          Menu Items
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {activeTab === 'orders' ? (
          <>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Live Orders</h2>
                <p className="text-slate-500 text-sm mt-1">Manage kitchen tickets and deliveries</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-sm font-semibold text-slate-700">
                {activeOrders.length} Active Orders
              </div>
            </div>

            {isFetching && orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="font-medium">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <CheckCircle className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-lg font-bold text-slate-700">All caught up!</h3>
                <p className="text-slate-500">There are no orders in the system right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {activeOrders.map((order) => (
                  <OrderCard 
                    key={order.orderId} 
                    order={order} 
                    updatingId={updatingId} 
                    updateStatus={updateStatus} 
                    getStatusColor={getStatusColor} 
                  />
                ))}

                {activeOrders.length > 0 && pastOrders.length > 0 && (
                  <div className="col-span-full py-4 flex items-center gap-4">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <h3 className="text-slate-400 font-semibold uppercase tracking-wider text-sm">Completed Orders</h3>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                )}

                {pastOrders.map((order) => (
                  <OrderCard 
                    key={order.orderId} 
                    order={order} 
                    updatingId={updatingId} 
                    updateStatus={updateStatus} 
                    getStatusColor={getStatusColor} 
                  />
                ))}

              </div>
            )}
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Menu Management</h2>
                <p className="text-slate-500 text-sm mt-1">Add or remove items from your live menu</p>
              </div>
              <button 
                onClick={() => setIsMenuModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Plus size={18} /> Add New Item
              </button>
            </div>

            {isFetchingMenu && menuItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="font-medium">Loading menu...</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Item Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {menuItems.map((item, i) => {
                        // Foolproof ID catching: Uses the very first column of the sheet even if not named 'id'
                        const firstKey = Object.keys(item)[0];
                        const itemId = item.id || item.ID || item.Id || item[firstKey]; 
                        
                        return (
                          <tr key={i} className={`transition-colors ${item.isAvailable === false ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                            <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                            <td className="px-6 py-4 text-slate-500">{item.category || "-"}</td>
                            <td className="px-6 py-4 font-bold text-slate-700">₹{item.price}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${item.isAvailable !== false ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                                {item.isAvailable !== false ? 'Available' : 'Unavailable'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-1">
                              <button 
                                onClick={() => handleToggleMenu(itemId)}
                                disabled={actionLoading !== null}
                                className="text-slate-400 hover:text-blue-500 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                                title={item.isAvailable !== false ? "Mark Unavailable" : "Mark Available"}
                              >
                                {actionLoading === `toggle-${itemId}` ? <Loader2 size={18} className="animate-spin" /> : (item.isAvailable !== false ? <EyeOff size={18} /> : <Eye size={18} />)}
                              </button>
                              <button 
                                onClick={() => handleDeleteMenu(itemId)}
                                disabled={actionLoading !== null}
                                className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Delete Item"
                              >
                                {actionLoading === `delete-${itemId}` ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {menuItems.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                            No menu items found. Click "Add New Item" to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSubmittingMenu && setIsMenuModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <MenuIcon className="text-blue-500" size={20} /> Add Menu Item
              </h3>
              <button onClick={() => setIsMenuModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddMenu} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Item Name *</label>
                <input 
                  type="text" required
                  value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Cheese Burger"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Price (₹) *</label>
                  <input 
                    type="number" required min="0"
                    value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="150"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <input 
                    type="text" 
                    value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Fast Food"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Image Link (Optional)</label>
                <input 
                  type="url"
                  value={menuForm.image} onChange={e => setMenuForm({...menuForm, image: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                <textarea 
                  rows="2"
                  value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Short description of the item"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" disabled={isSubmittingMenu}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex justify-center items-center gap-2"
                >
                  {isSubmittingMenu ? <><Loader2 size={20} className="animate-spin" /> Saving Item...</> : "Save to Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 ${toast.type === "error" ? "bg-red-500 text-white" : "bg-slate-800 text-white"}`}>
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, updatingId, updateStatus, getStatusColor }) {
  const isUpdating = updatingId === order.orderId;
  const timeFormatted = new Date(order.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all ${order.status === 'Delivered' ? 'opacity-60 grayscale hover:grayscale-0' : 'border-slate-200'}`}>
      <div className={`px-5 py-3 border-b flex justify-between items-center ${getStatusColor(order.status).split(' ')[0]} bg-opacity-20`}>
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">#{order.orderId.split('-')[1]?.slice(-4) || order.orderId}</span>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Clock size={14}/> {timeFormatted}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="px-5 py-4 border-b border-dashed border-slate-200 space-y-2 flex-1">
        <div className="flex items-start gap-2 text-sm">
          <User size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <span className="font-semibold text-slate-700">{order.name}</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <Phone size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <span className="text-slate-600">{order.phone}</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <span className="text-slate-600 line-clamp-2">{order.address}</span>
        </div>
      </div>

      <div className="px-5 py-4 bg-slate-50 flex-1">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order Items ({order.items.length})</div>
        <ul className="space-y-2">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between items-start text-sm">
              <span className="font-medium text-slate-700 pr-2">• {item.name}</span>
              <span className="text-slate-500 font-medium">₹{item.price}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center font-bold">
          <span className="text-slate-800">Total</span>
          <span className="text-blue-600 text-lg">₹{order.total}</span>
        </div>
      </div>

      <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
        {order.status === "New" && (
          <button 
            onClick={() => updateStatus(order, "Preparing")}
            disabled={isUpdating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-bold flex justify-center items-center gap-1.5 transition-colors"
          >
            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <><ChefHat size={16} /> Accept & Cook</>}
          </button>
        )}
        
        {order.status === "Preparing" && (
          <button 
            onClick={() => updateStatus(order, "Ready")}
            disabled={isUpdating}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl text-sm font-bold flex justify-center items-center gap-1.5 transition-colors"
          >
            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Mark Ready</>}
          </button>
        )}
        
        {order.status === "Ready" && (
          <button 
            onClick={() => updateStatus(order, "Delivered")}
            disabled={isUpdating}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold flex justify-center items-center gap-1.5 transition-colors"
          >
            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <><Truck size={16} /> Send out</>}
          </button>
        )}

        {order.status === "Delivered" && (
          <div className="flex-1 py-2 text-center text-sm font-bold text-slate-400 bg-slate-50 rounded-xl">
            Order Complete
          </div>
        )}
      </div>
    </div>
  );
}