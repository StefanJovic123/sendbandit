'use client'

import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  IconUpload,
  IconLoader2,
  IconFile,
  IconX,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { createBrowserClient } from '@/lib/api'

interface ImportContactsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onSuccess?: () => void
}

type ImportStep = 'upload' | 'mapping' | 'importing' | 'complete'

type ColumnMapping = {
  [csvColumn: string]: string | null
}

const contactFields = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'externalId', label: 'External ID' },
  { key: 'whatsappId', label: 'WhatsApp ID' },
  { key: 'telegramId', label: 'Telegram ID' },
  { key: 'facebookId', label: 'Facebook ID' },
  { key: 'instagramId', label: 'Instagram ID' },
  { key: 'slackId', label: 'Slack ID' },
  { key: 'discordId', label: 'Discord ID' },
]

// Simple CSV parser
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n')
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map((line) => parseCSVLine(line))

  return { headers, rows }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  result.push(current.trim())
  return result
}

// Auto-detect column mappings based on header names
function autoDetectMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[_\s-]/g, ''))

  const fieldPatterns: { field: string; patterns: string[] }[] = [
    { field: 'firstName', patterns: ['firstname', 'first', 'fname', 'givenname'] },
    { field: 'lastName', patterns: ['lastname', 'last', 'lname', 'surname', 'familyname'] },
    { field: 'email', patterns: ['email', 'emailaddress', 'mail'] },
    { field: 'phone', patterns: ['phone', 'phonenumber', 'mobile', 'cell', 'telephone'] },
    { field: 'externalId', patterns: ['externalid', 'id', 'customerid', 'userid'] },
    { field: 'whatsappId', patterns: ['whatsappid', 'whatsapp', 'wa'] },
    { field: 'telegramId', patterns: ['telegramid', 'telegram', 'tg'] },
    { field: 'facebookId', patterns: ['facebookid', 'facebook', 'fb'] },
    { field: 'instagramId', patterns: ['instagramid', 'instagram', 'ig'] },
    { field: 'slackId', patterns: ['slackid', 'slack'] },
    { field: 'discordId', patterns: ['discordid', 'discord'] },
  ]

  headers.forEach((header, index) => {
    const normalized = normalizedHeaders[index]
    for (const { field, patterns } of fieldPatterns) {
      if (patterns.includes(normalized)) {
        mapping[header] = field
        break
      }
    }
    if (!mapping[header]) {
      mapping[header] = null
    }
  })

  return mapping
}

export function ImportContactsDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: ImportContactsDialogProps) {
  const { getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [updateExisting, setUpdateExisting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    imported: number
    updated: number
    failed: number
    errors: Array<{ row: number; error: string }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setCsvData(null)
    setColumnMapping({})
    setUpdateExisting(false)
    setImporting(false)
    setProgress(0)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      reset()
    }
    onOpenChange(isOpen)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setError(null)
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseCSV(text)

        if (parsed.headers.length === 0) {
          setError('CSV file appears to be empty')
          return
        }

        setCsvData(parsed)
        setColumnMapping(autoDetectMappings(parsed.headers))
        setStep('mapping')
      } catch {
        setError('Failed to parse CSV file')
      }
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(selectedFile)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(fakeEvent)
    }
  }

  function handleMappingChange(csvColumn: string, contactField: string | null) {
    setColumnMapping((prev) => ({
      ...prev,
      [csvColumn]: contactField === 'none' ? null : contactField,
    }))
  }

  async function handleImport() {
    if (!csvData) return

    setImporting(true)
    setStep('importing')
    setProgress(0)
    setError(null)

    try {
      const apiClient = createBrowserClient(getToken)

      // Build contacts array from CSV data
      const contacts = csvData.rows.map((row) => {
        const contact: Record<string, string> = {}
        csvData.headers.forEach((header, index) => {
          const field = columnMapping[header]
          if (field && row[index]) {
            contact[field] = row[index]
          }
        })
        return contact
      }).filter((c) => Object.keys(c).length > 0)

      if (contacts.length === 0) {
        setError('No valid contacts to import. Please check your column mappings.')
        setStep('mapping')
        setImporting(false)
        return
      }

      // Send to API
      const response = await apiClient.contacts.import(clientId, {
        contacts,
        updateExisting,
      })

      setResult({
        imported: response.data.imported,
        updated: response.data.updated,
        failed: response.data.failed,
        errors: response.data.errors || [],
      })
      setProgress(100)
      setStep('complete')
    } catch (err) {
      console.error('Import failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to import contacts')
      setStep('mapping')
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    if (result && result.imported > 0) {
      onSuccess?.()
    }
    handleOpenChange(false)
  }

  // Get already-mapped fields to prevent duplicates
  const mappedFields = new Set(Object.values(columnMapping).filter(Boolean))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file to import contacts'}
            {step === 'mapping' && 'Map CSV columns to contact fields'}
            {step === 'importing' && 'Importing contacts...'}
            {step === 'complete' && 'Import complete'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: File Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <IconUpload className="mx-auto size-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                Drop your CSV file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .csv files up to 10,000 rows
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && csvData && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <IconFile className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {csvData.rows.length} rows, {csvData.headers.length} columns
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={reset}
              >
                <IconX className="size-4" />
              </Button>
            </div>

            {/* Column mappings */}
            <div className="space-y-3">
              <Label>Column Mapping</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {csvData.headers.map((header) => (
                  <div key={header} className="flex items-center gap-3">
                    <div className="w-1/3 text-sm font-medium truncate" title={header}>
                      {header}
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex-1">
                      <Select
                        value={columnMapping[header] || 'none'}
                        onValueChange={(v) => handleMappingChange(header, v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">Skip this column</span>
                          </SelectItem>
                          {contactFields.map((field) => (
                            <SelectItem
                              key={field.key}
                              value={field.key}
                              disabled={mappedFields.has(field.key) && columnMapping[header] !== field.key}
                            >
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {csvData.rows.length > 0 && (
              <div className="space-y-2">
                <Label>Preview (first 3 rows)</Label>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {csvData.headers.map((header) => (
                          <th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            {columnMapping[header] || <span className="text-muted-foreground">-</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-t">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 whitespace-nowrap truncate max-w-[150px]">
                              {cell || <span className="text-muted-foreground">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="updateExisting"
                checked={updateExisting}
                onCheckedChange={(checked) => setUpdateExisting(checked === true)}
              />
              <Label htmlFor="updateExisting" className="text-sm font-normal cursor-pointer">
                Update existing contacts (matched by External ID)
              </Label>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <IconLoader2 className="size-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Importing contacts, please wait...
              </p>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <IconCheck className="size-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Import completed successfully
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {result.imported} imported, {result.updated} updated
                  {result.failed > 0 && `, ${result.failed} failed`}
                </p>
              </div>
            </div>

            {result.failed > 0 && result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <IconAlertTriangle className="size-4" />
                  <p className="text-sm font-medium">Some rows failed to import</p>
                </div>
                <div className="max-h-[150px] overflow-y-auto border rounded-lg p-3 text-sm space-y-1">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-muted-foreground">
                      Row {err.row + 2}: {err.error}
                    </p>
                  ))}
                  {result.errors.length > 10 && (
                    <p className="text-muted-foreground">
                      ...and {result.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={reset}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                <IconUpload className="mr-2 size-4" />
                Import {csvData?.rows.length} Contacts
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
