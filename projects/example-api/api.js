const express = require("express");
const app = express();
const port = 4210;

app.use(
  express.json({
    type: "*/*",
  })
);

// @ts-ignore
const movies = require("./imdb-5000-movies.json");

app.get("/", (req, res) => res.send("Hello World!"));
app.get("/api", (req, res) => res.send("Hello API World!"));

app.post("/api/movies", (req, res) => {
  let allRows = getDataFromRequest(req);

  // apply pagination
  const pageSize = req.query.pageSize || 20;
  const page = req.query.page || 1;
  const response = allRows.slice((page - 1) * pageSize, page * pageSize);

  res.send({
    _embedded: {
      resourceList: response,
    },
    _page: {
      size: pageSize,
      totalElements: allRows.length,
      totalPages: Math.floor(allRows.length / pageSize),
      number: page,
    },
  });
});

app.post("/api/movies/all", (req, res) => {
  let response = getDataFromRequest(req);

  res.send({
    _embedded: {
      resourceList: response,
    },
  });
});

const GENRES =
  "Action|Animation|Adventure|Comedy|Drama|Family|Fantasy|Horror|Musical|Romance|Sci-Fi|Thriller";

app.get("/api/movies/config", (req, res) => {
  // see src\lib\smart-table\smart-table.types.ts - SmartTableConfig
  res.send({
    url: "/api/movies",
    baseFilters: [],
    columns: [
      {
        label: "Titel",
        key: "movie_title",
        type: "text",
        sortPath: "movie_title",
        hyperlink: "true",
        canHide: false,
      },
      {
        label: "Jaar",
        key: "title_year",
        type: "number",
        sortPath: "title_year",
      },
      {
        label: "Regisseur",
        key: "director_name",
        type: "text",
        sortPath: "director_name",
      },
      {
        label: "Rating",
        key: "imdb_score",
        type: "rating",
        sortPath: "imdb_score",
      },
    ],
    filters: [
      {
        id: "smartfilter",
        display: "generic",
        type: "input",
        label: "Zoek een film",
        placeholder: "Zoek op titel, jaar, ...",
        fields: ["movie_title", "director_name", "title_year"],
      },
      {
        id: "archived",
        display: "visible",
        type: "checkbox",
        label: "Toon gearchiveerde projecten",
        field: "Archived",
        checked: false,
      },
      {
        id: "title",
        display: "optional",
        type: "input",
        label: "Titel",
        field: "movie_title",
      },
      {
        id: "director",
        display: "optional",
        type: "input",
        label: "Regisseur",
        field: "director_name",
        placeholder: "Selecteer een regisseur",
      },
      {
        id: "genre",
        display: "optional",
        type: "select",
        options: GENRES.split("|").map((v) => ({ id: v, label: v })),
        label: "Genre",
        field: "genres",
        placeholder: "Alle Genres",
      },
      {
        id: "director-select",
        display: "optional",
        type: "multi-select",
        placeholder: "Selecteer een regisseur",
        options: [
          {
            id: "Zack Snyder",
            label: "Zack Snyder",
          },
          {
            id: "Anthony Russo",
            label: "Anthony Russo",
          },
          {
            id: "Justin Lin",
            label: "Justin Lin",
          },
        ],
        label: "Regisseurs",
        field: "director_name",
      },
    ],
    options: {
      defaultSortOrder: {
        key: "movie_title",
        order: "asc",
      },
      pageSizeOptions: [5, 10, 15],
      pageSize: 10,
      loadDataMessage: "De films worden geladen...",
      noDataMessage: "Er zijn geen films die voldoen aan de criteria",
      exportTitle: "Filmexport",
      prefixUrl: 'https://www.imdb.com/find?q=',
    },
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function getDataFromRequest(req) {
  const body = req.body || {};

  let response = movies.slice();

  var patternList = [];
  // apply filtering
  if (body.filters && body.filters.length) {
    body.filters.forEach((filter) => {
      if (Array.isArray(filter.value)) {
        filter.value.forEach((value) => {
          patternList.push(value);
        });
        response = response.filter((value) => {
          let include = false;
          filter.fields.forEach((field) => {
            if (patternList.includes(value[field])) include = true;
          });
          return include;
        });
      } else {
        const matchOn =
          filter.value && filter.value.id
            ? filter.value.id
            : filter.value
              .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
              .replace(/[%*]/g, ".*");
        const pattern = new RegExp(matchOn, "i");
        response = response.filter((value) => {
          let include = false;
          filter.fields.forEach((field) => {
            const str = "" + value[field];
            if (str.match(pattern)) include = true;
          });
          return include;
        });
      }
    });
  }

  // apply sorting
  const sortField = body.sort ? body.sort.path : null;
  const sortAsc = body.sort ? body.sort.ascending : true;
  if (sortField) {
    response.sort((a, b) => {
      const aval = a[sortField];
      const bval = b[sortField];
      let res = 0;
      if (typeof aval === "string") {
        res = aval.localeCompare(bval);
      } else {
        res = aval > bval ? 1 : aval < bval ? -1 : 0;
      }
      return sortAsc ? res : -res;
    });
  }

  return response;
}
