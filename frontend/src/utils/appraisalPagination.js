export function paginateApplications(rows, requestedPage) {
 const pages=Math.max(1,Math.ceil(rows.length/10))
 const page=Math.max(1,Math.min(Number.isInteger(requestedPage)?requestedPage:1,pages))
 const start=(page-1)*10
 return {rows:rows.slice(start,start+10),page,pages,start}
}
