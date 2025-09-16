import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uyqpvhcjsflogujbfheu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cXB2aGNqc2Zsb2d1amJmaGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTQ4NzQsImV4cCI6MjA3MjQ5MDg3NH0.Yn75_sNjk8-bZhvFRyGZML3rLWro0W4tsBXhdcE6aDA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Sidebar toggle for mobile
const menuBtn = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("show");
});

// ✅ Initialize Select2 for book search
$(document).ready(function () {
  $('#book').select2({
    placeholder: "Search or select a book",
    allowClear: true,
    width: '100%'
  });
});

// Elements
const addBookBtn = document.getElementById("addBook");
const cartTableBody = document.querySelector("#cartTable tbody");
const grandTotalEl = document.getElementById("grandTotal");
const saleForm = document.getElementById("saleForm");

// ✅ Load books from Supabase
async function loadBooks() {
  const { data, error } = await supabase.from("books").select("id, title, price");
  if (error) {
    console.error("Error loading books:", error);
    return;
  }
  const bookSelect = document.getElementById("book");
  bookSelect.innerHTML = `<option value="">-- Choose Book --</option>`;
  data.forEach((book) => {
    const option = document.createElement("option");
    option.value = book.id;
    option.textContent = `${book.title}`;
    option.dataset.price = book.price;
    bookSelect.appendChild(option);
  });
  $('#book').select2(); // refresh Select2
}

// ✅ Function to recalc total dynamically
function recalcTotal() {
  let total = 0;
  document.querySelectorAll("#cartTable tbody tr").forEach(row => {
    const subtotal = parseFloat(
      row.querySelector(".subtotal").textContent.replace("₵", "")
    ) || 0;
    total += subtotal;
  });
  grandTotalEl.textContent = total.toFixed(2);
}

// ✅ Add book to cart
addBookBtn.addEventListener("click", () => {
  const bookSelect = document.getElementById("book");
  const qtyInput = document.getElementById("quantity");

  const bookId = bookSelect.value;
  const bookName = bookSelect.selectedOptions[0]?.textContent;
  const price = parseFloat(bookSelect.selectedOptions[0]?.dataset.price || 0);
  const qty = parseInt(qtyInput.value);

  if (!bookId || qty < 1) return;

  const subtotal = price * qty;

  const row = document.createElement("tr");
  row.dataset.bookId = bookId;
  row.innerHTML = `
    <td>${bookName}</td>
    <td><input type="number" class="form-control form-control-sm qty-input" value="${qty}" min="1"></td>
    <td>₵${price.toFixed(2)}</td>
    <td class="subtotal">₵${subtotal.toFixed(2)}</td>
    <td><button class="btn btn-sm btn-danger remove">❌</button></td>
  `;

  // Remove book
  row.querySelector(".remove").addEventListener("click", () => {
    row.remove();
    recalcTotal();
  });

  // Quantity change updates subtotal + total
  row.querySelector(".qty-input").addEventListener("input", (e) => {
    const newQty = parseInt(e.target.value) || 1;
    const newSubtotal = price * newQty;
    row.querySelector(".subtotal").textContent = `₵${newSubtotal.toFixed(2)}`;
    recalcTotal();
  });

  // Append row + recalc totals
  cartTableBody.appendChild(row);
  recalcTotal();

  // Reset form fields
  $('#book').val(null).trigger('change'); // reset Select2 dropdown
  qtyInput.value = 1;
});

// ✅ Save Sale
saleForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rows = document.querySelectorAll("#cartTable tbody tr");
  if (rows.length === 0) return alert("Cart is empty!");

  const studentName = document.getElementById("studentName").value;
  const studentClass = document.getElementById("studentClass").value;
  const total = parseFloat(grandTotalEl.textContent);

  // Insert sale
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert([{ student_name: studentName, student_class: studentClass, total_amount: total }])
    .select()
    .single();

  if (saleError) {
    console.error(saleError);
    return alert("Error saving sale");
  }

  // Insert items
  const items = Array.from(rows).map(row => {
    const bookId = row.dataset.bookId;
    const qty = parseInt(row.querySelector(".qty-input").value);
    const price = parseFloat(row.cells[2].textContent.replace("₵", ""));
    const subtotal = parseFloat(row.querySelector(".subtotal").textContent.replace("₵", ""));
    return { sale_id: sale.id, book_id: bookId, quantity: qty, price, subtotal };
  });

  const { error: itemsError } = await supabase.from("sale_items").insert(items);
  if (itemsError) {
    console.error(itemsError);
    return alert("Error saving sale items");
  }

  alert("✅ Sale saved successfully!");
  cartTableBody.innerHTML = "";
  recalcTotal();
  saleForm.reset();
  $('#book').val(null).trigger('change');

  loadTransactions();
  loadStats();
});

// ✅ Load Transactions
async function loadTransactions() {
  const { data, error } = await supabase
    .from("sales")
    .select("id, student_name, student_class, total_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.getElementById("transactionsTableBody");
  tbody.innerHTML = "";
  data.forEach((t) => {
    const row = `
      <tr>
        <td>${t.student_name}</td>
        <td>${t.student_class}</td>
        <td>Multiple</td>
        <td>₵${t.total_amount}</td>
        <td>${new Date(t.created_at).toLocaleDateString()}</td>
      </tr>
    `;
    tbody.insertAdjacentHTML("beforeend", row);
  });
}

// ✅ Load Stats
async function loadStats() {
  const today = new Date().toISOString().split("T")[0];

  const { data: sales, error } = await supabase
    .from("sales")
    .select("id, total_amount, student_name, created_at")
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  if (error) {
    console.error(error);
    return;
  }

  const totalAmount = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const students = new Set(sales.map((s) => s.student_name));

  const { data: items } = await supabase
    .from("sale_items")
    .select("quantity")
    .in("sale_id", sales.map((s) => s.id));

  const booksSold = items ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;

  document.getElementById("salesToday").textContent = `₵${totalAmount.toFixed(2)}`;
  document.getElementById("studentsServed").textContent = students.size;
  document.getElementById("booksSoldToday").textContent = booksSold;
}

// ✅ Init
loadBooks();
loadTransactions();
loadStats();
