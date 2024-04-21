enum QueryState {
  Pending,
  Running,
  Finished,
}

export class Query {
  state: QueryState;

  query: WebGLQuery;

  ext: {TIME_ELAPSED_EXT: number};

  constructor(private gl: WebGL2RenderingContext) {
    this.state = QueryState.Pending;
    this.query = gl.createQuery()!;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  }

  start(): void {
    if (this.state !== QueryState.Pending) return;

    this.state = QueryState.Running;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
  }

  finish(): void {
    if (this.state !== QueryState.Running) return;

    this.state = QueryState.Finished;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
  }

  poll(): number | undefined {
    if (this.state !== QueryState.Finished) return;

    const available = this.gl.getQueryParameter(this.query, this.gl.QUERY_RESULT_AVAILABLE);
    if (!available) return;

    this.state = QueryState.Pending;
    return this.gl.getQueryParameter(this.query, this.gl.QUERY_RESULT);
  }
}
