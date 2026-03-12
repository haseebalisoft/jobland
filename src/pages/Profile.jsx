// import { useEffect, useState } from 'react'
// import api from '../services/api.js'

// export default function Profile() {
//   const [profile, setProfile] = useState({
//     title: '',
//     employment_type: '',
//     experience_years: '',
//     earliest_start_date: '',
//     preferred_country: '',
//     preferred_city: '',
//     remote_preference: '',
//     work_authorisation: '',
//   })
//   const [education, setEducation] = useState([])
//   const [work, setWork] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [saving, setSaving] = useState(false)
//   const [message, setMessage] = useState('')

//   useEffect(() => {
//     let isMounted = true
//     api
//       .get('/profile')
//       .then((res) => {
//         if (!isMounted) return
//         const { profile: p, education: edu, work_experience: w } = res.data
//         if (p) setProfile({ ...profile, ...p, experience_years: p.experience_years || '' })
//         if (edu) setEducation(edu)
//         if (w) setWork(w)
//       })
//       .catch(() => {
//         setProfile((prev) => prev)
//       })
//       .finally(() => {
//         if (isMounted) setLoading(false)
//       })
//     return () => {
//       isMounted = false
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   const handleProfileChange = (e) => {
//     const { name, value } = e.target
//     setProfile((prev) => ({ ...prev, [name]: value }))
//   }

//   const updateEdu = (index, field, value) => {
//     setEducation((prev) => {
//       const copy = [...prev]
//       copy[index] = { ...copy[index], [field]: value }
//       return copy
//     })
//   }

//   const addEdu = () => setEducation((prev) => [...prev, {}])
//   const removeEdu = (index) =>
//     setEducation((prev) => prev.filter((_, i) => i !== index))

//   const updateWork = (index, field, value) => {
//     setWork((prev) => {
//       const copy = [...prev]
//       copy[index] = { ...copy[index], [field]: value }
//       return copy
//     })
//   }

//   const addWork = () => setWork((prev) => [...prev, {}])
//   const removeWork = (index) =>
//     setWork((prev) => prev.filter((_, i) => i !== index))

//   const handleSave = async (e) => {
//     e.preventDefault()
//     setSaving(true)
//     setMessage('')
//     try {
//       await api.post('/profile', {
//         profile: {
//           ...profile,
//           experience_years:
//             profile.experience_years === '' ? null : Number(profile.experience_years),
//         },
//         education,
//         work_experience: work,
//       })
//       setMessage('Profile saved successfully.')
//     } catch (err) {
//       setMessage(err.response?.data?.message || 'Failed to save profile')
//     } finally {
//       setSaving(false)
//     }
//   }

//   if (loading) {
//     return <div style={{ padding: 40 }}>Loading profile...</div>
//   }

//   return (
//     <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
//       <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Your Profile</h1>
//       <p style={{ marginBottom: 24, color: '#555' }}>
//         Update your professional profile so BD and admin views can surface accurate information.
//       </p>

//       <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
//         <section>
//           <h2 style={{ fontSize: 20, marginBottom: 12 }}>Overview</h2>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
//             <Field
//               label="Title"
//               name="title"
//               value={profile.title || ''}
//               onChange={handleProfileChange}
//               placeholder="Senior Backend Engineer"
//             />
//             <Field
//               label="Employment Type"
//               name="employment_type"
//               value={profile.employment_type || ''}
//               onChange={handleProfileChange}
//               placeholder="full_time, contract, etc."
//             />
//             <Field
//               label="Experience (years)"
//               name="experience_years"
//               type="number"
//               value={profile.experience_years}
//               onChange={handleProfileChange}
//               placeholder="3"
//             />
//             <Field
//               label="Earliest Start Date"
//               name="earliest_start_date"
//               type="date"
//               value={profile.earliest_start_date || ''}
//               onChange={handleProfileChange}
//             />
//             <Field
//               label="Preferred Country"
//               name="preferred_country"
//               value={profile.preferred_country || ''}
//               onChange={handleProfileChange}
//             />
//             <Field
//               label="Preferred City"
//               name="preferred_city"
//               value={profile.preferred_city || ''}
//               onChange={handleProfileChange}
//             />
//             <Field
//               label="Remote Preference"
//               name="remote_preference"
//               value={profile.remote_preference || ''}
//               onChange={handleProfileChange}
//               placeholder="remote_only, onsite_only, hybrid..."
//             />
//             <Field
//               label="Work Authorisation"
//               name="work_authorisation"
//               value={profile.work_authorisation || ''}
//               onChange={handleProfileChange}
//               placeholder="e.g. US citizen, EU work permit"
//             />
//           </div>
//         </section>

//         <section>
//           <h2 style={{ fontSize: 20, marginBottom: 12 }}>Education</h2>
//           {education.map((edu, index) => (
//             <div
//               key={index}
//               style={{
//                 border: '1px solid #e5e7eb',
//                 borderRadius: 8,
//                 padding: 16,
//                 marginBottom: 12,
//               }}
//             >
//               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//                 <Field
//                   label="Degree"
//                   value={edu.degree || ''}
//                   onChange={(e) => updateEdu(index, 'degree', e.target.value)}
//                 />
//                 <Field
//                   label="Field of Study"
//                   value={edu.field_of_study || ''}
//                   onChange={(e) => updateEdu(index, 'field_of_study', e.target.value)}
//                 />
//                 <Field
//                   label="Institution"
//                   value={edu.institution || ''}
//                   onChange={(e) => updateEdu(index, 'institution', e.target.value)}
//                 />
//                 <Field
//                   label="Start Date"
//                   type="date"
//                   value={edu.start_date || ''}
//                   onChange={(e) => updateEdu(index, 'start_date', e.target.value)}
//                 />
//                 <Field
//                   label="End Date"
//                   type="date"
//                   value={edu.end_date || ''}
//                   onChange={(e) => updateEdu(index, 'end_date', e.target.value)}
//                 />
//               </div>
//               <div style={{ marginTop: 8 }}>
//                 <label style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
//                   Description
//                 </label>
//                 <textarea
//                   value={edu.description || ''}
//                   onChange={(e) => updateEdu(index, 'description', e.target.value)}
//                   rows={3}
//                   style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}
//                 />
//               </div>
//               <button
//                 type="button"
//                 onClick={() => removeEdu(index)}
//                 style={{ marginTop: 8, fontSize: 13 }}
//               >
//                 Remove
//               </button>
//             </div>
//           ))}
//           <button type="button" onClick={addEdu} style={{ fontSize: 14 }}>
//             + Add education
//           </button>
//         </section>

//         <section>
//           <h2 style={{ fontSize: 20, marginBottom: 12 }}>Work Experience</h2>
//           {work.map((w, index) => (
//             <div
//               key={index}
//               style={{
//                 border: '1px solid #e5e7eb',
//                 borderRadius: 8,
//                 padding: 16,
//                 marginBottom: 12,
//               }}
//             >
//               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//                 <Field
//                   label="Company"
//                   value={w.company_name || ''}
//                   onChange={(e) => updateWork(index, 'company_name', e.target.value)}
//                 />
//                 <Field
//                   label="Job Title"
//                   value={w.job_title || ''}
//                   onChange={(e) => updateWork(index, 'job_title', e.target.value)}
//                 />
//                 <Field
//                   label="Start Date"
//                   type="date"
//                   value={w.start_date || ''}
//                   onChange={(e) => updateWork(index, 'start_date', e.target.value)}
//                 />
//                 <Field
//                   label="End Date"
//                   type="date"
//                   value={w.end_date || ''}
//                   onChange={(e) => updateWork(index, 'end_date', e.target.value)}
//                 />
//               </div>
//               <div style={{ marginTop: 8 }}>
//                 <label style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
//                   Description
//                 </label>
//                 <textarea
//                   value={w.description || ''}
//                   onChange={(e) => updateWork(index, 'description', e.target.value)}
//                   rows={3}
//                   style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}
//                 />
//               </div>
//               <button
//                 type="button"
//                 onClick={() => removeWork(index)}
//                 style={{ marginTop: 8, fontSize: 13 }}
//               >
//                 Remove
//               </button>
//             </div>
//           ))}
//           <button type="button" onClick={addWork} style={{ fontSize: 14 }}>
//             + Add experience
//           </button>
//         </section>

//         {message && (
//           <div style={{ fontSize: 14, color: message.includes('failed') ? 'red' : 'green' }}>
//             {message}
//           </div>
//         )}

//         <button
//           type="submit"
//           disabled={saving}
//           style={{
//             marginTop: 12,
//             padding: '10px 18px',
//             borderRadius: 8,
//             border: 'none',
//             background: '#4F46E5',
//             color: 'white',
//             fontWeight: 600,
//             cursor: saving ? 'not-allowed' : 'pointer',
//           }}
//         >
//           {saving ? 'Saving...' : 'Save profile'}
//         </button>
//       </form>
//     </div>
//   )
// }

// function Field({ label, name, value, onChange, type = 'text', placeholder }) {
//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
//       <label style={{ fontSize: 14 }}>{label}</label>
//       <input
//         name={name}
//         type={type}
//         value={value || ''}
//         onChange={onChange}
//         placeholder={placeholder}
//         style={{
//           padding: 8,
//           borderRadius: 6,
//           border: '1px solid #e5e7eb',
//           fontSize: 14,
//         }}
//       />
//     </div>
//   )
// }

