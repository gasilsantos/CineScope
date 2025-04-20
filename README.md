# CineScope

Um aplicativo web simples para pesquisar filmes e séries usando a API do The Movie Database (TMDb).

acesse aqui : https://gasilsantos.github.io/CineScope/

## Funcionalidades

*   Navegação entre **Filmes Populares** e **Séries Populares**.
*   **Busca** por filmes e séries (com debounce para otimização).
*   **Paginação** dos resultados (populares, séries, busca, filtros).
*   **Filtro por Gênero** para as listas de populares.
*   Página de **Detalhes** completa para cada item, incluindo:
    *   Pôster, título, ano, descrição.
    *   Gêneros, duração/temporadas, avaliação TMDb.
    *   Elenco principal, diretor/criadores.
    *   **Trailer** incorporado (se disponível no YouTube).
    *   Seção de **Recomendações** com itens semelhantes.
*   Sistema de **Favoritos**: marque/desmarque filmes/séries (❤️) e veja sua lista salva localmente (`localStorage`).
*   Interface responsiva utilizando Tailwind CSS.
*   Indicadores de carregamento visual (**Skeleton Loading**) para uma experiência mais suave.
*   Otimização de carregamento de imagens (**Lazy Loading**).
*   Navegação fácil de volta à página inicial clicando no título "CineScope".

## Como Executar Localmente

1.  Clone este repositório:
    ```bash
    git clone <url-do-repositorio>
    cd <nome-do-repositorio>
    ```
2.  Abra o arquivo `index.html` em seu navegador.

    *Observação: Não é necessário um servidor local. O projeto usa HTML, CSS (Tailwind via CDN), JavaScript do lado do cliente e `localStorage` para salvar favoritos.*

## Como Hospedar no GitHub Pages

1.  Certifique-se de que seu repositório no GitHub se chama `{seu-usuario}.github.io` ou crie um repositório com qualquer nome.
2.  Vá para as configurações (Settings) do seu repositório no GitHub.
3.  Na seção "Pages" (ou "GitHub Pages"), selecione a branch que contém seus arquivos (geralmente `main` ou `master`) e a pasta `/` (root) como fonte.
4.  Salve as alterações.
5.  Após alguns minutos, seu site estará disponível em `https://{seu-usuario}.github.io/` (se o repositório for `{seu-usuario}.github.io`) ou `https://{seu-usuario}.github.io/{nome-do-repositorio}/`.

## Tecnologias Utilizadas

*   HTML5
*   Tailwind CSS (via CDN)
*   JavaScript (Vanilla)
*   The Movie Database (TMDb) API
*   Font Awesome (para ícones)
*   `localStorage` (para Favoritos)

## Exemplo Visual (Inspirado em)

*(Baseado na imagem de exemplo fornecida e funcionalidades adicionadas)*

*   Tema escuro.
*   Layout em grade para resultados com paginação e skeleton loading.
*   Navegação principal com botões e filtro de gênero.
*   Cards com pôsteres (lazy loading), informações básicas e botão para favoritar.
*   Seção de detalhes com layout em colunas, informações ricas, trailer, recomendações e botão para favoritar. 
