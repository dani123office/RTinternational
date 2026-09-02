/**
 * Utility to export tabular JSON data to a CSV/Excel-compatible file.
 * Includes UTF-8 BOM (\uFEFF) for native Excel symbol and encoding support.
 */

export function exportToCsv(data, filename = 'export.csv', columns = null) {
  if (!data || !data.length) {
    alert('No data available to export.')
    return
  }

  let headers = []
  let keys = []

  if (columns && columns.length) {
    headers = columns.map(c => c.label || c.key)
    keys = columns.map(c => c.key)
  } else {
    keys = Object.keys(data[0])
    headers = keys
  }

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""'
    let str = String(val)
    if (str.includes('"')) {
      str = str.replace(/"/g, '""')
    }
    return `"${str}"`
  }

  const rows = [headers.map(escapeCsv).join(',')]

  for (const item of data) {
    const row = keys.map((key) => {
      let val = item[key]
      if (typeof val === 'function') {
        val = val(item)
      } else if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val)
      }
      return escapeCsv(val)
    })
    rows.push(row.join(','))
  }

  const csvContent = '\uFEFF' + rows.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
