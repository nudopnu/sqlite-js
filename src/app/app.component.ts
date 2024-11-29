import { AfterViewInit, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import initSqlJs from 'sql.js/dist/sql-wasm';
import Parser from 'web-tree-sitter';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit {
  async parseGooseMigration(sourceCode: string) {
    let up = '';
    let down = '';
    const parts = sourceCode.split(/(-- \+goose Up|-- \+goose Down)/);
    parts.forEach((part, idx) => {
      if (part === '-- +goose Up') {
        up = parts[idx + 1].trim();
      } else if (part === '-- +goose Down') {
        down = parts[idx + 1].trim();
      }
    });
    return [await this.cleanSQL(up), await this.cleanSQL(down)];
  }

  async cleanSQL(sql: string) {
    await Parser.init();
    const Lang = await Parser.Language.load('tree-sitter-sql.wasm');
    const parser = new Parser();
    parser.setLanguage(Lang);
    let tree = parser.parse(sql);
    let removals: { startIndex: number; endIndex: number }[] = [];

    function clean(node: Parser.SyntaxNode) {
      if (node.isError) {
        const { startIndex, endIndex } = node;
        removals.push({ startIndex, endIndex });
      } else {
        node.children.forEach((node) => clean(node));
      }
    }
    clean(tree.rootNode);
    let offset = 0;
    removals.forEach(({ startIndex, endIndex }) => {
      sql =
        sql.slice(0, startIndex + offset) + sql.slice(endIndex + offset + 1);
      offset -= endIndex + startIndex;
    });
    return sql;
  }

  async ngAfterViewInit() {
    const sourceCode = `
    -- +goose Up

CREATE TABLE params (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    keyword TEXT NOT NULL,
	location_id TEXT NOT NULL,
	distance INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    udpated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down

DROP TABLE params;
`;
    const [up, down] = await this.parseGooseMigration(sourceCode);

    const config = {
      locateFile: (filename: string) => `/dist/${filename}`,
    };
    const SQL = await initSqlJs(config);

    //Create the database
    const db = new SQL.Database();

    // Run a query without reading the results
    db.run(up);

    // Prepare a statement
    const stmt = db.prepare(
      'SELECT * FROM test WHERE col1 BETWEEN $start AND $end'
    );
    stmt.getAsObject({ $start: 1, $end: 1 }); // {col1:1, col2:111}

    // Bind new values
    stmt.bind({ $start: 1, $end: 2 });
    while (stmt.step()) {
      //
      const row = stmt.getAsObject();
      console.log('Here is a row: ' + JSON.stringify(row));
    }
  }
  title = 'sqlite-js';
}
