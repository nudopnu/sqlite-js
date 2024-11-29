import { AfterViewInit, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import initSqlJs from 'sql.js/dist/sql-wasm';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit {
  async ngAfterViewInit() {
    const config = {
      locateFile: (filename: string) => `/dist/${filename}`,
    };
    const SQL = await initSqlJs(config);
    //Create the database
    const db = new SQL.Database();
    // Run a query without reading the results
    db.run('CREATE TABLE test (col1, col2);');
    // Insert two rows: (1,111) and (2,222)
    db.run('INSERT INTO test VALUES (?,?), (?,?)', [1, 111, 2, 222]);

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
