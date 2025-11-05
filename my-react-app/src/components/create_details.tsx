import React, { useState } from 'react'
import "./create_details.css"

export type CreateFormData = {
  title: string
  description: string
  day: string
  start_time: string
  end_time: string
  categories: string[]
}

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateFormData) => void
}

export default function CreateDetails({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [day, setDay] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [categories, setCategories] = useState('')

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title,
      description,
      day,
      start_time: startTime,
      end_time: endTime,
      categories: categories.split(',').map(s => s.trim()).filter(Boolean),
    })
    onClose()
  }

  return (
    <div className='create-modal-root'>
      <div className="create-modal-backdrop" onClick={onClose} />
      <div className="create-modal">
        <form onSubmit={handleSubmit} className='form'>
          <div className="title">Create Event</div>
            <div className="input-container ic1">
            <input
              id="title"
              className="input"
              type="text"
              placeholder=" "
              title="Title"
              aria-label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="cut"></div>
            <label htmlFor="title" className="placeholder">Title</label>
            </div>
          <div className="input-container ic1">
            <input id="description" className="input" type="text" placeholder=" " title="Description" aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="cut"></div>
            <label htmlFor="description" className="placeholder">Description</label>
          </div>
          <div className="input-container ic1">
            <input id="day" className="input" type="text" placeholder="" title="Day" aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)} />
            <div className="cut"></div>
            <label htmlFor="day" className="placeholder">Day (YYYY-MM-DD)</label>
          </div>
          <div className="input-container ic1">
            <input id="start-time" className="input" type="time" placeholder=" " title="Start time" aria-label="Start time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <div className="cut"></div>
            <label htmlFor="start-time" className="placeholder">Start Time</label>
          </div>
          <div className="input-container ic1">
            <input id="end-time" className="input" type="time" placeholder=" " title="End time" aria-label="End time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <div className="cut"></div>
            <label htmlFor="end-time" className="placeholder">End Time</label>
          </div>
          <div className="input-container ic1">
            <input
              id="categories"
              className="input"
              type="text"
              placeholder=" "
              title="Categories"
              aria-label="Categories"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
            />
            <div className="cut"></div>
            <label htmlFor="categories" className="placeholder">Categories (comma-separated)</label>
          </div>
          <button type="submit" className="submit">Save</button>
        </form>
      </div>
    </div>
  )
}
