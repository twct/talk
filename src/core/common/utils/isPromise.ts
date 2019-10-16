function isPromise(arg: any): arg is Promise<any> {
  return typeof arg.then === "function" && typeof arg.catch === "function";
}

export default isPromise;
