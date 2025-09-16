import { supabase } from "../supabaseClient.js";

const form = document.getElementById("bookForm");
const tableBody = document.querySelector("#bookTable tbody");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const cost = parseFloat(document.getElementById("cost").value);
  const selling = parseFloat(document.getElementById("selling").value);
  const quantity = parseInt(document.getElementById("quantity").value);
  const status = document.getElementById("status").value;

  // Insert
  const { data, error } = await supabase.from("books").insert([
    { title, cost_price: cost, selling_price: selling, quantity, status }
  ]);

  if (error) {
    alert("❌ Failed: " + error.message);
    return;
  }

  // Fetch computed row
  const { data: reports } = await supabase
    .from("book_reports")
    .select("*")
    .eq("id", data[0].id);

  const book = reports[0];
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${book.title}</td>
    <td>₵${book.cost_price}</td>
    <td>₵${book.selling_price}</td>
    <td>${book.quantity}</td>
    <td>₵${book.total_cost}</td>
    <td>₵${book.expected_sales}</td>
    <td>₵${book.total_profit}</td>
    <td>${book.profit_percent}%</td>
    <td>
  <td>
  <span class="badge ${
    book.status === "in stock" ? "bg-success" : "bg-danger"
  }">
    ${book.status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
  </span>
</td>
    <td>
      <button class="btn btn-sm btn-warning">✏️ Edit</button>
      <button class="btn btn-sm btn-danger">🗑 Delete</button>
    </td>
  `;
  tableBody.appendChild(row);

  form.reset();
});
