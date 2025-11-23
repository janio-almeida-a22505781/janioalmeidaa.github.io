const API_URL = "https://deisishop.pythonanywhere.com";
const IMG_DEFAULT = "https://placehold.co/120x120?text=Sem+Imagem";

async function carregarProdutos() {
  try {
    const resposta = await fetch(`${API_URL}/products/`);
    if (!resposta.ok) throw new Error("Erro ao obter produtos");
    const produtos = await resposta.json();
    mostrarProdutos(produtos);

    document.getElementById("ordenar").addEventListener("change", () => aplicarFiltros(produtos));
    document.getElementById("tipo").addEventListener("change", () => aplicarFiltros(produtos));
    document.getElementById("busca").addEventListener("input", () => aplicarFiltros(produtos));
  } catch (erro) {
    document.getElementById("lista-produtos").innerHTML = "<p>Erro ao carregar produtos.</p>";
  }
}

function aplicarFiltros(produtos) {
  const tipo = document.getElementById("tipo").value;
  const ordenar = document.getElementById("ordenar").value;
  const busca = document.getElementById("busca").value.toLowerCase();

  let filtrados = produtos.filter(p =>
    (!tipo || p.category.toLowerCase().includes(tipo.toLowerCase())) &&
    (!busca || p.title.toLowerCase().includes(busca))
  );

  if (ordenar === "asc") filtrados.sort((a, b) => a.price - b.price);
  else if (ordenar === "desc") filtrados.sort((a, b) => b.price - a.price);

  mostrarProdutos(filtrados);
}

function mostrarProdutos(produtos) {
  const lista = document.getElementById("lista-produtos");
  lista.innerHTML = "";

  produtos.forEach(produto => {
    const imagem = produto.image
      ? (produto.image.startsWith("http") ? produto.image : `${API_URL}${produto.image}`)
      : IMG_DEFAULT;

    const artigo = document.createElement("article");
    artigo.innerHTML = `
      <h3>${produto.title}</h3>
      <img src="${imagem}" alt="${produto.title}" width="120">
      <p>${produto.description}</p>
      <p><strong>Preço: €${produto.price.toFixed(2)}</strong></p>
      <button onclick="adicionarAoCesto(${produto.id}, '${produto.title.replace(/'/g, "\\'")}', ${produto.price}, '${imagem.replace(/'/g, "\\'")}')">Adicionar ao Cesto</button>
    `;
    lista.appendChild(artigo);
  });
}

function obterCesto() {
  return JSON.parse(localStorage.getItem("cesto")) || [];
}

function guardarCesto(cesto) {
  localStorage.setItem("cesto", JSON.stringify(cesto));
}

function adicionarAoCesto(id, title, preco, imagem) {
  const cesto = obterCesto();
  const item = cesto.find(p => p.id === id);
  if (item) item.quantidade++;
  else cesto.push({ id, title, preco, quantidade: 1, imagem });
  guardarCesto(cesto);
  atualizarCesto();
}

function removerDoCesto(id) {
  let cesto = obterCesto();
  cesto = cesto.filter(p => p.id !== id);
  guardarCesto(cesto);
  atualizarCesto();
}

function atualizarCesto() {
  const lista = document.getElementById("lista-cesto");
  const totalTexto = document.getElementById("total-cesto");
  lista.innerHTML = "";
  const cesto = obterCesto();

  if (cesto.length === 0) {
    lista.classList.add("vazio");
    lista.innerHTML = "<p>O cesto está vazio.</p>";
    totalTexto.textContent = "Custo total: €0.00";
    return;
  } else {
    lista.classList.remove("vazio");
  }

  let total = 0;
  cesto.forEach(item => {
    total += item.preco * item.quantidade;
    const artigo = document.createElement("article");
    artigo.innerHTML = `
      <h4>${item.title}</h4>
      <img src="${item.imagem}" alt="${item.title}" width="120">
      <p>Quantidade: ${item.quantidade}</p>
      <p>Subtotal: €${(item.preco * item.quantidade).toFixed(2)}</p>
      <button onclick="removerDoCesto(${item.id})">Remover do Cesto</button>
    `;
    lista.appendChild(artigo);
  });

  totalTexto.textContent = `Custo total: €${total.toFixed(2)}`;
}

document.getElementById("form-compra").addEventListener("submit", async (e) => {
  e.preventDefault();

  const estudante = document.getElementById("estudante").checked;
  const cupao = document.getElementById("cupao").value.trim();
  const cesto = obterCesto();

  if (cesto.length === 0) {
    alert("O cesto está vazio!");
    return;
  }

  let produtos = [];

  cesto.forEach(item => {
    produtos.push(...Array(item.quantidade).fill(item.id))
  });

  const data = { products: produtos, student: estudante, coupon: cupao };

  try {
    const resposta = await fetch(`${API_URL}/buy/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) throw new Error(resultado.error || "Erro ao processar compra.");

    document.getElementById("resultado-compra").innerHTML = `
      <p>${resultado.message}</p>
      <p><strong>Referência de pagamento:</strong> ${resultado.reference}</p>
      <p><strong>Valor final:</strong> €${resultado.totalCost}</p>
    `;

  } catch (erro) {
    document.getElementById("resultado-compra").innerHTML =
      `<p style="color:red;">Erro ao finalizar compra: ${erro.message}</p>`;
  }
});

window.onload = function () {
  carregarProdutos();
  atualizarCesto();
};