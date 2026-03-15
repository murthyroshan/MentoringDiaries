import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
    BookOpen,
    MessageSquare,
    Zap,
    Trophy,
    GraduationCap,
    CalendarCheck,
} from 'lucide-react'
import api from '../../services/api'
import GrowthTimeline from '../../components/ui/Timeline/GrowthTimeline'
import { SkeletonTimeline } from '../../components/ui/Skeletons/SkeletonTimeline'

const TIMELINE_META = {
    diary_entry: { icon: BookOpen, color: '#8b5cf6', label: 'Diary Entry' },
    mentor_response: { icon: MessageSquare, color: '#22c55e', label: 'Mentor Response' },
    skill_added: { icon: Zap, color: '#10b981', label: 'Skill Added' },
    academic_update: { icon: GraduationCap, color: '#06b6d4', label: 'Academic Update' },
    event_attended: { icon: Trophy, color: '#f59e0b', label: 'Event Attended' },
    session_update: { icon: CalendarCheck, color: '#f97316', label: 'Mentoring Session' },
}

export default function StudentTimeline() {
    const { data, isLoading } = useQuery({
        queryKey: ['student-timeline'],
        queryFn: () => api.get('/student/timeline').then((r) => r.data),
    })

    const timeline = data?.data || []

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Student Timeline</h2>
                <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    Unified activity feed across diary, responses, skills, academics, and events.
                </p>
            </div>

            {isLoading ? (
                <SkeletonTimeline count={4} />
            ) : timeline.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No timeline events yet.</p>
                </div>
            ) : (
                <GrowthTimeline 
                    items={timeline.map((item, i) => {
                        const meta = TIMELINE_META[item.type] || TIMELINE_META.diary_entry
                        return {
                            id: `${item.type}-${i}-${item.timestamp}`,
                            title: item.title,
                            description: item.description,
                            date: format(new Date(item.timestamp), 'dd MMM yyyy, hh:mm a'),
                            metrics: { category: meta.label }
                        }
                    })} 
                />
            )}
        </div>
    )
}

