import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchComplaintSettings, updateComplaintSettings } from '../store/complaintSettingsSlice'
import ComplaintTopNav from '../components/ComplaintTopNav'
import { Button } from 'src/components/ui/button'
import { Badge } from 'src/components/ui/badge'
import { Input } from 'src/components/ui/input'
import { Checkbox } from 'src/components/ui/checkbox'
import { Switch } from 'src/components/ui/switch'
import { Label } from 'src/components/ui/label'
import {
  Save,
  Plus,
  X,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Trash2,
  Settings,
  Mail,
  Shield,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import '../styles/_complaints.scss'

const ComplaintSettings = () => {
  const dispatch = useDispatch()
  const { data: settingsData, status, error } = useSelector((state) => state.complaintSettings)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(null)
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(null)

  useEffect(() => {
    dispatch(fetchComplaintSettings())
  }, [dispatch])

  useEffect(() => {
    if (status === 'succeeded' && settingsData) {
      setSettings(settingsData)
      setLoading(false)
    } else if (status === 'failed') {
      toast.error(error || 'Failed to load settings')
      setLoading(false)
    }
  }, [status, settingsData, error])

  const handleChange = (section, field, value) => {
    setSettings((prev) => {
      if (section) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value,
          },
        }
      }
      return {
        ...prev,
        [field]: value,
      }
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await dispatch(updateComplaintSettings(settings)).unwrap()
      toast.success('Settings saved successfully!')
    } catch (err) {
      toast.error(err || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const addDepartment = (name) => {
    if (!name) return
    setSettings((prev) => ({
      ...prev,
      departments: [...(prev.departments || []), { name, description: '', isActive: true }],
    }))
  }

  const removeDepartment = (idx) => {
    setSettings((prev) => {
      const deps = [...(prev.departments || [])]
      deps.splice(idx, 1)
      return { ...prev, departments: deps }
    })
  }

  const addCategory = (name) => {
    if (!name) return
    setSettings((prev) => ({
      ...prev,
      categories: [
        ...(prev.categories || []),
        { name, description: '', isActive: true, order: 0, suggestedIssues: [] },
      ],
    }))
  }

  const removeCategory = (idx) => {
    setSettings((prev) => {
      const cats = [...(prev.categories || [])]
      cats.splice(idx, 1)
      return { ...prev, categories: cats }
    })
    if (activeCategoryIdx === idx) setActiveCategoryIdx(null)
  }

  const addSuggestedIssue = (catIdx, issueName) => {
    if (!issueName) return
    setSettings((prev) => {
      const cats = [...(prev.categories || [])]
      if (!cats[catIdx].suggestedIssues) cats[catIdx].suggestedIssues = []
      const order = cats[catIdx].suggestedIssues.length
      cats[catIdx].suggestedIssues.push({ name: issueName, isActive: true, order, usageCount: 0 })
      return { ...prev, categories: cats }
    })
  }

  const removeSuggestedIssue = (catIdx, issueIdx) => {
    setSettings((prev) => {
      const cats = [...(prev.categories || [])]
      cats[catIdx].suggestedIssues.splice(issueIdx, 1)
      return { ...prev, categories: cats }
    })
  }

  const toggleSuggestedIssue = (catIdx, issueIdx) => {
    setSettings((prev) => {
      const cats = [...(prev.categories || [])]
      cats[catIdx].suggestedIssues[issueIdx].isActive = !cats[catIdx].suggestedIssues[issueIdx]
        .isActive
      return { ...prev, categories: cats }
    })
  }

  const archiveSuggestedIssue = (catIdx, issueIdx) => {
    setSettings((prev) => {
      const cats = [...(prev.categories || [])]
      cats[catIdx].suggestedIssues[issueIdx].isActive = false
      cats[catIdx].suggestedIssues[issueIdx].isArchived = true
      return { ...prev, categories: cats }
    })
  }

  const moveSuggestedIssue = (catIdx, issueIdx, dir) => {
    setSettings((prev) => {
      const cats = [...(prev.categories || [])]
      const issues = cats[catIdx].suggestedIssues
      if (dir === 'up' && issueIdx > 0) {
        ;[issues[issueIdx - 1], issues[issueIdx]] = [issues[issueIdx], issues[issueIdx - 1]]
      } else if (dir === 'down' && issueIdx < issues.length - 1) {
        ;[issues[issueIdx + 1], issues[issueIdx]] = [issues[issueIdx], issues[issueIdx + 1]]
      }
      return { ...prev, categories: cats }
    })
  }

  const activeCategoryData =
    activeCategoryIdx !== null && settings.categories?.[activeCategoryIdx]
      ? settings.categories[activeCategoryIdx]
      : null

  const issueAnalytics = useMemo(() => {
    if (!activeCategoryData || !activeCategoryData.suggestedIssues) return null
    const issues = activeCategoryData.suggestedIssues
    const activeCount = issues.filter((i) => i.isActive && !i.isArchived).length
    const disabledCount = issues.filter((i) => !i.isActive && !i.isArchived).length
    const archivedCount = issues.filter((i) => i.isArchived).length
    const neverUsedCount = issues.filter((i) => i.usageCount === 0 && !i.isArchived).length
    const sortedByUsage = [...issues]
      .filter((i) => !i.isArchived)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))

    return {
      activeCount,
      disabledCount,
      archivedCount,
      neverUsedCount,
      mostUsed: sortedByUsage[0] || null,
      leastUsed: sortedByUsage[sortedByUsage.length - 1] || null,
    }
  }, [activeCategoryData])

  const addStatus = (name) => {
    if (!name) return
    setSettings((prev) => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        statuses: [...(prev.workflow?.statuses || []), { name, enabled: true, color: '#3b82f6' }],
      },
    }))
  }

  const removeStatus = (idx) => {
    setSettings((prev) => {
      const statuses = [...(prev.workflow?.statuses || [])]
      statuses.splice(idx, 1)
      return {
        ...prev,
        workflow: { ...prev.workflow, statuses },
      }
    })
  }

  const addQuestion = (question) => {
    if (!question) return
    setSettings((prev) => ({
      ...prev,
      feedbackQuestions: [
        ...(prev.feedbackQuestions || []),
        { question, isRequired: false, isActive: true, order: 0 },
      ],
    }))
  }

  const removeQuestion = (idx) => {
    setSettings((prev) => {
      const q = [...(prev.feedbackQuestions || [])]
      q.splice(idx, 1)
      return { ...prev, feedbackQuestions: q }
    })
  }

  if (loading || !settings) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <ComplaintTopNav />
      <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
        {/* Title & Save */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white">System Settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Configure departments, priorities, SLAs, workflows and feedback
            </p>
          </div>
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving} className="text-xs font-bold px-4 flex items-center gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Departments */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white mb-4">Departments</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {(settings.departments || []).map((dep, idx) => (
                  <Badge
                    key={idx}
                    variant="lightPrimary"
                    className="text-xs px-3 py-1 font-bold flex items-center gap-1.5"
                  >
                    {dep.name}
                    <X
                      className="h-3.5 w-3.5 text-gray-400 hover:text-danger cursor-pointer shrink-0"
                      onClick={() => removeDepartment(idx)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="new-dept-input"
                  type="text"
                  placeholder="New dept name"
                  className="text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById('new-dept-input')
                    addDepartment(input.value)
                    input.value = ''
                  }}
                  className="text-xs font-semibold px-4 border-stroke dark:border-strokedark text-black dark:text-white"
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="h-px bg-stroke dark:bg-strokedark" />

            {/* Categories & Issues */}
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white mb-4">Categories & Issues</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {(settings.categories || []).map((cat, idx) => {
                  const isSelected = activeCategoryIdx === idx
                  return (
                    <Badge
                      key={idx}
                      variant={isSelected ? 'default' : 'lightSecondary'}
                      onClick={() => setActiveCategoryIdx(isSelected ? null : idx)}
                      className="text-xs px-3 py-1 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {cat.name}
                      <X
                        className="h-3.5 w-3.5 hover:text-danger cursor-pointer shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCategory(idx)
                        }}
                      />
                    </Badge>
                  )
                })}
              </div>
              <div className="flex gap-2 mb-6">
                <Input
                  id="new-cat-input"
                  type="text"
                  placeholder="New category name"
                  className="text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById('new-cat-input')
                    addCategory(input.value)
                    input.value = ''
                  }}
                  className="text-xs font-semibold px-4 border-stroke dark:border-strokedark text-black dark:text-white"
                >
                  Add Category
                </Button>
              </div>

              {activeCategoryData && (
                <div className="rounded-lg border border-stroke p-4 bg-slate-50 dark:border-strokedark dark:bg-meta-4/20 space-y-4">
                  <h4 className="text-xs font-bold text-black dark:text-white">
                    Suggested Issues for {activeCategoryData.name}
                  </h4>

                  {issueAnalytics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded border border-stroke p-3 bg-white dark:border-strokedark dark:bg-boxdark text-center">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-semibold mb-0.5">Active / Disabled</span>
                        <span className="text-sm font-extrabold text-black dark:text-white">
                          {issueAnalytics.activeCount} / {issueAnalytics.disabledCount}
                        </span>
                      </div>
                      <div className="rounded border border-stroke p-3 bg-white dark:border-strokedark dark:bg-boxdark text-center">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-semibold mb-0.5 font-semibold text-warning">Never Used</span>
                        <span className="text-sm font-extrabold text-warning">
                          {issueAnalytics.neverUsedCount}
                        </span>
                      </div>
                      <div className="rounded border border-stroke p-3 bg-white dark:border-strokedark dark:bg-boxdark text-center overflow-hidden">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-semibold mb-0.5 font-semibold text-primary">Most Used</span>
                        <span className="text-xs font-extrabold text-primary truncate block">
                          {issueAnalytics.mostUsed?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="rounded border border-stroke p-3 bg-white dark:border-strokedark dark:bg-boxdark text-center overflow-hidden">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-semibold mb-0.5 font-semibold text-danger">Least Used</span>
                        <span className="text-xs font-extrabold text-danger truncate block">
                          {issueAnalytics.leastUsed?.name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      id="new-issue-input"
                      type="text"
                      placeholder="E.g., Tap Leakage"
                      className="text-xs flex-1"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById('new-issue-input')
                        addSuggestedIssue(activeCategoryIdx, input.value)
                        input.value = ''
                      }}
                      className="text-xs font-bold"
                    >
                      Add Issue
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-stroke dark:divide-strokedark">
                    {!(activeCategoryData.suggestedIssues?.filter((i) => !i.isArchived).length > 0) && (
                      <div className="text-center py-4 text-xs text-gray-400 italic">
                        No active suggested issues added yet.
                      </div>
                    )}
                    {(activeCategoryData.suggestedIssues || []).map((issue, issueIdx) => {
                      if (issue.isArchived) return null
                      return (
                        <div key={issueIdx} className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2 flex-1 pr-4">
                            <span
                              className={`text-xs font-semibold ${
                                issue.isActive
                                  ? 'text-black dark:text-white'
                                  : 'text-gray-400 line-through'
                              }`}
                            >
                              {issue.name}
                            </span>
                            {issue.usageCount > 0 ? (
                              <Badge variant="lightPrimary" className="text-[9px] px-1.5 py-0 font-bold shrink-0">
                                {issue.usageCount} times
                              </Badge>
                            ) : (
                              <Badge variant="lightWarning" className="text-[9px] px-1.5 py-0 font-bold shrink-0">
                                Never Used
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <ChevronUp
                                className="h-4 w-4 cursor-pointer text-gray-400 hover:text-black dark:hover:text-white"
                                onClick={() => moveSuggestedIssue(activeCategoryIdx, issueIdx, 'up')}
                              />
                              <ChevronDown
                                className="h-4 w-4 cursor-pointer text-gray-400 hover:text-black dark:hover:text-white"
                                onClick={() => moveSuggestedIssue(activeCategoryIdx, issueIdx, 'down')}
                              />
                            </div>
                            <Switch
                              checked={issue.isActive !== false}
                              onCheckedChange={() => toggleSuggestedIssue(activeCategoryIdx, issueIdx)}
                            />
                            {issue.usageCount === 0 ? (
                              <Trash2
                                className="h-4 w-4 text-danger cursor-pointer"
                                onClick={() => {
                                  if (window.confirm('Permanently delete this suggestion?'))
                                    removeSuggestedIssue(activeCategoryIdx, issueIdx)
                                }}
                              />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm('Archive this suggestion? It will no longer appear in the UI.'))
                                    archiveSuggestedIssue(activeCategoryIdx, issueIdx)
                                }}
                                className="text-[10px] font-semibold h-6 px-2 border-stroke"
                              >
                                Archive
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: SLA & Priorities */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white mb-4">
                Service Level Agreements (SLA) & Priorities
              </h3>
              <div className="space-y-4">
                {settings.slaRules && settings.slaRules.length > 0 ? (
                  settings.slaRules.map((rule, idx) => {
                    let priorityVariant = 'lightSecondary'
                    if (rule.priority === 'Critical') priorityVariant = 'lightError'
                    else if (rule.priority === 'High') priorityVariant = 'lightWarning'

                    return (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-stroke dark:border-strokedark">
                        <div className="space-y-1">
                          <Badge variant={priorityVariant} className="text-[10px] px-2 py-0.5 font-bold">
                            {rule.priority}
                          </Badge>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-semibold">
                            Resolve within
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={rule.resolveWithinHours || 0}
                            onChange={(e) => {
                              const newRules = [...settings.slaRules]
                              newRules[idx].resolveWithinHours = Number(e.target.value)
                              handleChange(null, 'slaRules', newRules)
                            }}
                            className="w-20 text-xs font-bold text-center"
                          />
                          <span className="text-xs font-semibold text-gray-500">Hours</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400 italic">
                    No SLAs configured.
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-stroke dark:bg-strokedark" />

            {/* Working Hours */}
            <div>
              <h4 className="text-xs font-bold text-black dark:text-white mb-3">Working Hours</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="working-hours-start" className="text-2xs font-semibold">Start Time</Label>
                  <Input
                    id="working-hours-start"
                    type="time"
                    value={settings.workingHours?.start || '09:00'}
                    onChange={(e) => handleChange('workingHours', 'start', e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="working-hours-end" className="text-2xs font-semibold">End Time</Label>
                  <Input
                    id="working-hours-end"
                    type="time"
                    value={settings.workingHours?.end || '18:00'}
                    onChange={(e) => handleChange('workingHours', 'end', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Workflow */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white mb-4">Workflow Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="auto-close" className="text-xs font-semibold">Auto Close Days</Label>
                  <Input
                    id="auto-close"
                    type="number"
                    value={settings.workflow?.autoCloseDays || 7}
                    onChange={(e) => handleChange('workflow', 'autoCloseDays', Number(e.target.value))}
                    className="text-xs"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-medium">
                    Days after resolution to auto-close
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reopen-limit" className="text-xs font-semibold">Reopen Limit</Label>
                  <Input
                    id="reopen-limit"
                    type="number"
                    value={settings.workflow?.reopenLimit || 2}
                    onChange={(e) => handleChange('workflow', 'reopenLimit', Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-stroke dark:bg-strokedark" />

            {/* Custom Statuses */}
            <div>
              <h4 className="text-xs font-bold text-black dark:text-white mb-3">Custom Statuses</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {(settings.workflow?.statuses || []).map((status, idx) => (
                  <Badge
                    key={idx}
                    style={{ backgroundColor: status.color }}
                    className="text-xs px-3 py-1 font-bold text-white flex items-center gap-1.5 border-0"
                  >
                    {status.name}
                    <X
                      className="h-3.5 w-3.5 cursor-pointer shrink-0 opacity-70 hover:opacity-100"
                      onClick={() => removeStatus(idx)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="new-status-input"
                  type="text"
                  placeholder="New status name"
                  className="text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById('new-status-input')
                    addStatus(input.value)
                    input.value = ''
                  }}
                  className="text-xs font-semibold px-4 border-stroke dark:border-strokedark text-black dark:text-white"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Card 4: Notification Rules Table */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4">Notification Settings</h3>
            <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Event</th>
                    <th className="py-2.5 px-4 font-semibold text-black dark:text-white text-center">Email</th>
                    <th className="py-2.5 px-4 font-semibold text-black dark:text-white text-center">SMS</th>
                    <th className="py-2.5 px-4 font-semibold text-black dark:text-white text-center">Push</th>
                    <th className="py-2.5 px-4 font-semibold text-black dark:text-white text-center">In-App</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {[
                    'Complaint Created',
                    'Assigned',
                    'Accepted',
                    'Started',
                    'Completed',
                    'Closed',
                    'Reopened',
                    'Escalated',
                    'Cancelled',
                  ].map((evt, idx) => {
                    const rule = (settings.notifications?.events || []).find((r) => r.event === evt) || {
                      email: true,
                      sms: false,
                      push: true,
                      inApp: true,
                    }
                    const updateRule = (channel, checked) => {
                      const events = [...(settings.notifications?.events || [])]
                      const existingIdx = events.findIndex((r) => r.event === evt)
                      if (existingIdx >= 0) {
                        events[existingIdx] = { ...events[existingIdx], [channel]: checked }
                      } else {
                        events.push({ ...rule, event: evt, [channel]: checked })
                      }
                      handleChange('notifications', 'events', events)
                    }
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-meta-4/10">
                        <td className="py-2.5 px-4 font-bold text-black dark:text-white">{evt}</td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rule.email}
                            onChange={(e) => updateRule('email', e.target.checked)}
                            className="accent-primary"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rule.sms}
                            onChange={(e) => updateRule('sms', e.target.checked)}
                            className="accent-primary"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rule.push}
                            onChange={(e) => updateRule('push', e.target.checked)}
                            className="accent-primary"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rule.inApp}
                            onChange={(e) => updateRule('inApp', e.target.checked)}
                            className="accent-primary"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 5: Assignment Rules */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4">Assignment Rules</h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-meta-4/20 rounded-lg border border-stroke dark:border-strokedark">
              <Label htmlFor="autoAssign" className="text-xs font-bold text-black dark:text-white cursor-pointer select-none">
                Enable Auto Assignment
              </Label>
              <Switch
                id="autoAssign"
                checked={settings.assignmentRules?.autoAssign || false}
                onCheckedChange={(checked) => handleChange('assignmentRules', 'autoAssign', checked)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-method" className="text-xs font-semibold text-gray-500">Assignment Method</Label>
              <select
                id="assign-method"
                value={settings.assignmentRules?.method || 'Manual'}
                onChange={(e) => handleChange('assignmentRules', 'method', e.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
              >
                <option value="Manual" className="bg-white dark:bg-boxdark">Manual</option>
                <option value="Round Robin" className="bg-white dark:bg-boxdark">Round Robin</option>
                <option value="Workload Based" className="bg-white dark:bg-boxdark">Workload Based</option>
                <option value="Skill Based" className="bg-white dark:bg-boxdark">Skill Based</option>
                <option value="Department Based" className="bg-white dark:bg-boxdark">Department Based</option>
                <option value="Vendor Assignment" className="bg-white dark:bg-boxdark">Vendor Assignment</option>
              </select>
            </div>
          </div>

          {/* Card 6: Resident Feedback Switches */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4">Resident Feedback</h3>
            <div className="space-y-4">
              {[
                { key: 'enabled', label: 'Enable Resident Feedback' },
                { key: 'allowAnonymous', label: 'Allow Anonymous Feedback' },
                { key: 'mandatoryBeforeClosing', label: 'Mandatory Before Closing' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-meta-4/20 rounded-lg border border-stroke dark:border-strokedark">
                  <Label className="text-xs font-bold text-black dark:text-white select-none">
                    {item.label}
                  </Label>
                  <Switch
                    checked={settings.residentFeedback?.[item.key] || false}
                    onCheckedChange={(checked) => handleChange('residentFeedback', item.key, checked)}
                  />
                </div>
              ))}
            </div>

            <div className="h-px bg-stroke dark:bg-strokedark" />

            {/* Rating configuration */}
            <div className="space-y-1.5">
              <Label htmlFor="rating-scale" className="text-xs font-semibold text-gray-500">Rating Scale</Label>
              <select
                id="rating-scale"
                value={settings.ratingConfig?.scale || 5}
                onChange={(e) => handleChange('ratingConfig', 'scale', Number(e.target.value))}
                className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
              >
                <option value={3} className="bg-white dark:bg-boxdark">3 Stars</option>
                <option value={5} className="bg-white dark:bg-boxdark">5 Stars</option>
                <option value={10} className="bg-white dark:bg-boxdark">10 Stars</option>
              </select>
            </div>
          </div>

          {/* Card 7: Feedback Questions */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4">Feedback Questions</h3>
            <div className="space-y-3">
              {(settings.feedbackQuestions || []).map((fq, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-meta-4/20 rounded-lg border border-stroke dark:border-strokedark"
                >
                  <span className="text-xs font-semibold text-black dark:text-white">{fq.question}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-danger">
                      {fq.isRequired ? 'Required' : 'Optional'}
                    </span>
                    <Trash2
                      className="h-4 w-4 text-danger cursor-pointer hover:scale-105"
                      onClick={() => removeQuestion(idx)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                id="new-question-input"
                type="text"
                placeholder="e.g. Rate the technician behaviour"
                className="text-xs flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.getElementById('new-question-input')
                  addQuestion(input.value)
                  input.value = ''
                }}
                className="text-xs font-semibold px-4 border-stroke dark:border-strokedark text-black dark:text-white"
              >
                Add
              </Button>
            </div>

            <div className="h-px bg-stroke dark:bg-strokedark" />

            {/* Comment Settings */}
            <div>
              <h4 className="text-xs font-bold text-black dark:text-white mb-3">Comment Settings</h4>
              <div className="space-y-3">
                {[
                  { key: 'allowComments', label: 'Allow Comments' },
                  { key: 'mandatoryForLowRatings', label: 'Mandatory for Low Ratings' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-meta-4/20 rounded-lg border border-stroke dark:border-strokedark">
                    <Label className="text-xs font-bold text-black dark:text-white select-none">
                      {item.label}
                    </Label>
                    <Switch
                      checked={settings.commentSettings?.[item.key] ?? true}
                      onCheckedChange={(checked) => handleChange('commentSettings', item.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 8: Feedback Visibility & Analytics */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white mb-4">Feedback Visibility</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['resident', 'technician', 'facilityManager', 'admin', 'superAdmin'].map((role) => (
                  <div key={role} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-meta-4/20 rounded-lg border border-stroke dark:border-strokedark">
                    <Label className="text-xs font-bold text-black dark:text-white select-none capitalize">
                      {role.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <Switch
                      checked={settings.feedbackVisibility?.[role] ?? true}
                      onCheckedChange={(checked) => handleChange('feedbackVisibility', role, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-stroke dark:bg-strokedark" />

            {/* Feedback Analytics */}
            <div>
              <h4 className="text-xs font-bold text-black dark:text-white mb-3">Feedback Analytics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'averageRating',
                  'technicianRating',
                  'vendorRating',
                  'departmentRating',
                  'monthlyRating',
                  'residentSatisfaction',
                ].map((metric) => (
                  <div key={metric} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-meta-4/20 rounded-lg border border-stroke dark:border-strokedark">
                    <Label className="text-xs font-bold text-black dark:text-white select-none capitalize">
                      {metric.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <Switch
                      checked={settings.feedbackAnalytics?.[metric] ?? true}
                      onCheckedChange={(checked) => handleChange('feedbackAnalytics', metric, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 9: General Settings */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark space-y-6">
            <h3 className="text-sm font-bold text-black dark:text-white mb-4">General Settings</h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-meta-4/20 rounded-lg border border-stroke dark:border-strokedark">
              <Label htmlFor="dup-detection" className="text-xs font-bold text-black dark:text-white cursor-pointer select-none">
                Duplicate Complaint Detection
              </Label>
              <Switch
                id="dup-detection"
                checked={settings.general?.duplicateDetection || false}
                onCheckedChange={(checked) => handleChange('general', 'duplicateDetection', checked)}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dup-window" className="text-xs font-semibold text-gray-500">Duplicate Time Window (Hours)</Label>
                <Input
                  id="dup-window"
                  type="number"
                  value={settings.general?.duplicateTimeWindowHours || 24}
                  onChange={(e) => handleChange('general', 'duplicateTimeWindowHours', Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-attach" className="text-xs font-semibold text-gray-500">Max Attachment Size (MB)</Label>
                <Input
                  id="max-attach"
                  type="number"
                  value={settings.attachments?.maxSizeMB || 10}
                  onChange={(e) => handleChange('attachments', 'maxSizeMB', Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prefix" className="text-xs font-semibold text-gray-500">Complaint Number Prefix</Label>
                <Input
                  id="prefix"
                  type="text"
                  value={settings.ticketFormat?.prefix || 'CMP'}
                  onChange={(e) => handleChange('ticketFormat', 'prefix', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComplaintSettings
