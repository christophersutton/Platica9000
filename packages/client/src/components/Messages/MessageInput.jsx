import { useState } from 'react'
import { Upload } from 'lucide-react'


export default function MessageInput({ channelId, onSend }) {
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      // Upload to Supabase storage
      const fileName = `${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(fileName, file)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(data.path)

      // Add to message as attachment
      await onSend('', [{
        type: 'file',
        url: publicUrl,
        name: file.name
      }])
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() && !uploading) return

    await onSend(message)
    setMessage('')
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded border"
          disabled={uploading}
        />
        
        <label className="cursor-pointer">
          <input
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <Upload className={`w-6 h-6 ${uploading ? 'opacity-50' : ''}`} />
        </label>
        
        <button 
          type="submit"
          disabled={uploading || (!message.trim() && !uploading)}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  )
}