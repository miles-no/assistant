# Room Feedback Feature - Implementation Guide

This document provides a comprehensive guide for implementing the room feedback feature across all Miles Booking interfaces.

## ✅ **COMPLETED: Backend & Chat Assistant**

### Database & API
- ✅ **Prisma schema** updated with `RoomFeedback` model and `FeedbackStatus` enum
- ✅ **Migration** created and applied (`20251019194407_add_room_feedback`)
- ✅ **MCP Tools** implemented:
  - `create_room_feedback` - Any user can submit feedback
  - `update_feedback_status` - Any user can update status (OPEN/RESOLVED/DISMISSED) with required comment
- ✅ **MCP Resources** implemented:
  - `miles://feedback` - List all feedback with filtering (roomId, locationId, status, userId)
  - `miles://rooms/{roomId}/feedback` - Get feedback for specific room
- ✅ **Email notifications** ready (not tested):
  - Sends to location managers when feedback is created
  - Sends to reporter when status updates
  - Falls back to console logging if SMTP not configured
- ✅ **Seed data** with 4 sample feedback entries

### Chat Assistant
- ✅ **System prompt** updated with feedback examples
- ✅ **Tool integration** complete - AI can create and query feedback
- ✅ **User workflows** supported for creating and resolving feedback (comment required)

---

## 📋 **TODO: Web Application**

The web app (React + TypeScript + Vite) needs feedback UI integrated into existing pages.

### 1. Generate API Types

First, regenerate the OpenAPI client to include new feedback endpoints:

```bash
cd /Users/henry/dev/miles/booking/web
npm run openapi
```

This will generate TypeScript types in `src/api-generated/` from the API's OpenAPI spec.

### 2. Create Feedback Components

**File: `src/components/feedback/FeedbackList.tsx`**
```typescript
import { Badge, Card, Button } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface Feedback {
  id: string;
  message: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolutionComment?: string;
  submittedBy: {
    name: string;
    email: string;
  };
  resolvedBy?: {
    name: string;
    email: string;
  };
}

export function FeedbackList({ feedback, onStatusChange }: {
  feedback: Feedback[];
  onStatusChange?: (id: string, status: string, comment: string) => void;
}) {
  const statusConfig = {
    OPEN: { icon: AlertCircle, color: 'warning', label: 'Open' },
    RESOLVED: { icon: CheckCircle, color: 'success', label: 'Resolved' },
    DISMISSED: { icon: XCircle, color: 'default', label: 'Dismissed' },
  };

  return (
    <div className="space-y-3">
      {feedback.length === 0 ? (
        <Card className="text-center py-8 text-gray-500">
          No feedback submitted yet
        </Card>
      ) : (
        feedback.map((item) => {
          const StatusIcon = statusConfig[item.status].icon;
          return (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusIcon className="h-4 w-4" />
                    <Badge variant={statusConfig[item.status].color as any}>
                      {statusConfig[item.status].label}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{item.message}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Submitted by {item.submittedBy.name}
                  </p>
                  {item.resolutionComment && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-sm font-medium text-gray-700">Resolution:</p>
                      <p className="text-sm text-gray-600 mt-1">{item.resolutionComment}</p>
                      {item.resolvedBy && (
                        <p className="text-xs text-gray-500 mt-1">
                          Resolved by {item.resolvedBy.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Any user can resolve with comment */}
                {onStatusChange && item.status === 'OPEN' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const comment = prompt('Enter resolution comment (required):');
                      if (comment?.trim()) {
                        onStatusChange(item.id, 'RESOLVED', comment);
                      }
                    }}
                  >
                    Mark Resolved
                  </Button>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
```

**File: `src/components/feedback/FeedbackForm.tsx`**
```typescript
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { useToast } from '@/hooks/useToast';

export function FeedbackForm({ roomId, onSubmit }: {
  roomId: string;
  onSubmit: () => void;
}) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      // Call API to submit feedback
      await fetch(`${import.meta.env.VITE_API_URL}/api/mcp/tools/create_room_feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          arguments: {
            userId: getCurrentUserId(), // Get from auth store
            roomId,
            message,
          },
        }),
      });

      showToast('Feedback submitted successfully', 'success');
      setMessage('');
      onSubmit();
    } catch (error) {
      showToast('Failed to submit feedback', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Submit Feedback</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Report an issue or suggest an improvement..."
          className="w-full min-h-[100px] p-2 border rounded-lg"
          required
        />
        <Button type="submit" disabled={isSubmitting || !message.trim()}>
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </form>
    </Card>
  );
}
```

### 3. Add Hooks for API Calls

**File: `src/hooks/useFeedback.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export function useRoomFeedback(roomId: string) {
  return useQuery({
    queryKey: ['feedback', 'room', roomId],
    queryFn: async () => {
      const { data } = await axios.get(
        `${API_URL}/api/mcp/resources/rooms/${roomId}/feedback`
      );
      return JSON.parse(data.contents[0].text);
    },
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, message, userId }: {
      roomId: string;
      message: string;
      userId: string;
    }) => {
      const { data } = await axios.post(
        `${API_URL}/api/mcp/tools/create_room_feedback`,
        { arguments: { roomId, message, userId } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ feedbackId, status, userId, comment }: {
      feedbackId: string;
      status: string;
      userId: string;
      comment: string;
    }) => {
      const { data } = await axios.post(
        `${API_URL}/api/mcp/tools/update_feedback_status`,
        { arguments: { feedbackId, status, userId, comment } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}
```

### 4. Integrate into Room Pages

**Update: `src/pages/RoomsPage.tsx`**

Add a "Feedback" tab to the room detail view:

```typescript
import { FeedbackList } from '@/components/feedback/FeedbackList';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { useRoomFeedback } from '@/hooks/useFeedback';

// Inside room detail component:
const { data: feedbackData } = useRoomFeedback(roomId);

// Add to tabs:
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="bookings">Bookings</TabsTrigger>
    <TabsTrigger value="feedback">
      Feedback
      {feedbackData?.feedbackCount > 0 && (
        <Badge variant="warning" className="ml-2">
          {feedbackData.feedbackCount}
        </Badge>
      )}
    </TabsTrigger>
  </TabsList>

  <TabsContent value="feedback">
    <div className="space-y-6">
      <FeedbackForm roomId={roomId} onSubmit={() => refetch()} />
      <FeedbackList
        feedback={feedbackData?.feedback || []}
        onStatusChange={isManager ? handleStatusChange : undefined}
      />
    </div>
  </TabsContent>
</Tabs>
```

---

## 📋 **TODO: CLI**

The CLI (Go-based) needs feedback commands added.

### 1. Check CLI Structure

```bash
cd /Users/henry/dev/miles/booking/cli
ls -la
```

### 2. Add Feedback Commands

**File: `cmd/feedback.go` (new)**
```go
package cmd

import (
    "fmt"
    "github.com/spf13/cobra"
)

var feedbackCmd = &cobra.Command{
    Use:   "feedback",
    Short: "Manage room feedback",
    Long:  `Submit, view, and manage feedback for rooms`,
}

var feedbackSubmitCmd = &cobra.Command{
    Use:   "submit [room-name]",
    Short: "Submit feedback for a room",
    Args:  cobra.ExactArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        roomName := args[0]
        message, _ := cmd.Flags().GetString("message")

        // Get room ID from name
        roomID, err := getRoomIDByName(roomName)
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            return
        }

        // Submit feedback via API
        feedback, err := api.CreateFeedback(roomID, message)
        if err != nil {
            fmt.Printf("Error submitting feedback: %v\n", err)
            return
        }

        fmt.Printf("✓ Feedback submitted successfully (ID: %s)\n", feedback.ID)
        fmt.Printf("  Location managers have been notified\n")
    },
}

var feedbackListCmd = &cobra.Command{
    Use:   "list",
    Short: "List all feedback",
    Run: func(cmd *cobra.Command, args []string) {
        roomName, _ := cmd.Flags().GetString("room")
        status, _ := cmd.Flags().GetString("status")

        feedback, err := api.ListFeedback(roomName, status)
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            return
        }

        if len(feedback) == 0 {
            fmt.Println("No feedback found")
            return
        }

        fmt.Printf("\n%d feedback items:\n\n", len(feedback))
        for _, f := range feedback {
            fmt.Printf("  [%s] %s\n", f.Status, f.Room.Name)
            fmt.Printf("  │ %s\n", f.Message)
            fmt.Printf("  └─ by %s, %s\n\n", f.SubmittedBy.Name, timeAgo(f.CreatedAt))
        }
    },
}

var feedbackResolveCmd = &cobra.Command{
    Use:   "resolve [feedback-id]",
    Short: "Mark feedback as resolved with a comment",
    Args:  cobra.ExactArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        feedbackID := args[0]
        comment, _ := cmd.Flags().GetString("comment")

        if comment == "" {
            fmt.Printf("Error: --comment is required\n")
            return
        }

        err := api.UpdateFeedbackStatus(feedbackID, "RESOLVED", comment)
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            return
        }

        fmt.Printf("✓ Feedback marked as resolved\n")
    },
}

func init() {
    feedbackCmd.AddCommand(feedbackSubmitCmd)
    feedbackCmd.AddCommand(feedbackListCmd)
    feedbackCmd.AddCommand(feedbackResolveCmd)

    feedbackSubmitCmd.Flags().StringP("message", "m", "", "Feedback message (required)")
    feedbackSubmitCmd.MarkFlagRequired("message")

    feedbackListCmd.Flags().StringP("room", "r", "", "Filter by room name")
    feedbackListCmd.Flags().StringP("status", "s", "", "Filter by status (OPEN, RESOLVED, DISMISSED)")

    feedbackResolveCmd.Flags().StringP("comment", "c", "", "Resolution comment (required)")
    feedbackResolveCmd.MarkFlagRequired("comment")

    rootCmd.AddCommand(feedbackCmd)
}
```

### 3. Update API Client

**Add to: `internal/api/client.go`**
```go
type Feedback struct {
    ID          string    `json:"id"`
    Message     string    `json:"message"`
    Status      string    `json:"status"`
    CreatedAt   time.Time `json:"createdAt"`
    Room        Room      `json:"room"`
    SubmittedBy User      `json:"submittedBy"`
}

func (c *Client) CreateFeedback(roomID, message string) (*Feedback, error) {
    payload := map[string]interface{}{
        "arguments": map[string]string{
            "userId":  c.userID,
            "roomId":  roomID,
            "message": message,
        },
    }

    resp, err := c.post("/api/mcp/tools/create_room_feedback", payload)
    if err != nil {
        return nil, err
    }

    var result Feedback
    if err := json.Unmarshal(resp, &result); err != nil {
        return nil, err
    }

    return &result, nil
}

func (c *Client) ListFeedback(roomName, status string) ([]Feedback, error) {
    query := url.Values{}
    if status != "" {
        query.Set("status", status)
    }

    // If room name provided, first get room ID
    if roomName != "" {
        roomID, err := c.getRoomIDByName(roomName)
        if err != nil {
            return nil, err
        }
        query.Set("roomId", roomID)
    }

    resp, err := c.get(fmt.Sprintf("/api/mcp/resources/feedback?%s", query.Encode()))
    if err != nil {
        return nil, err
    }

    var result struct {
        Feedback []Feedback `json:"feedback"`
    }
    if err := json.Unmarshal(resp, &result); err != nil {
        return nil, err
    }

    return result.Feedback, nil
}

func (c *Client) UpdateFeedbackStatus(feedbackID, status, comment string) error {
    payload := map[string]interface{}{
        "arguments": map[string]string{
            "userId":     c.userID,
            "feedbackId": feedbackID,
            "status":     status,
            "comment":    comment,
        },
    }

    _, err := c.post("/api/mcp/tools/update_feedback_status", payload)
    return err
}
```

### 4. CLI Usage Examples

```bash
# Submit feedback
miles feedback submit "Skagen" -m "Projector remote is missing"

# List all feedback
miles feedback list

# List feedback for specific room
miles feedback list --room "Teamrommet"

# List only open issues
miles feedback list --status OPEN

# Mark feedback as resolved (with required comment)
miles feedback resolve <feedback-id> -c "Fixed the projector remote"
```

---

## 📋 **TODO: TUI**

The TUI (Terminal UI, likely Go + bubbletea) needs feedback screens.

### 1. Add Feedback View

**File: `internal/tui/feedback.go` (new)**
```go
package tui

import (
    "fmt"
    "strings"

    "github.com/charmbracelet/bubbles/list"
    "github.com/charmbracelet/bubbles/textarea"
    tea "github.com/charmbracelet/bubbletea"
    "github.com/charmbracelet/lipgloss"
)

type feedbackModel struct {
    list     list.Model
    textarea textarea.Model
    mode     string // "list" or "submit"
    feedback []Feedback
    width    int
    height   int
}

type Feedback struct {
    ID        string
    Message   string
    Status    string
    CreatedAt string
    Room      string
    Reporter  string
}

func NewFeedbackModel() feedbackModel {
    // Initialize list
    items := []list.Item{}
    l := list.New(items, feedbackDelegate{}, 0, 0)
    l.Title = "Room Feedback"

    // Initialize textarea for submission
    ta := textarea.New()
    ta.Placeholder = "Describe the issue or suggestion..."
    ta.Focus()

    return feedbackModel{
        list:     l,
        textarea: ta,
        mode:     "list",
    }
}

func (m feedbackModel) Init() tea.Cmd {
    return loadFeedback
}

func (m feedbackModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "ctrl+c", "q":
            return m, tea.Quit
        case "n":
            // Switch to submit mode
            m.mode = "submit"
            return m, nil
        case "esc":
            if m.mode == "submit" {
                m.mode = "list"
                m.textarea.Reset()
                return m, nil
            }
        case "enter":
            if m.mode == "submit" {
                // Submit feedback
                return m, submitFeedback(m.textarea.Value())
            }
        }

    case feedbackLoadedMsg:
        m.feedback = msg.feedback
        items := make([]list.Item, len(msg.feedback))
        for i, f := range msg.feedback {
            items[i] = feedbackItem(f)
        }
        m.list.SetItems(items)
    }

    if m.mode == "submit" {
        var cmd tea.Cmd
        m.textarea, cmd = m.textarea.Update(msg)
        return m, cmd
    }

    var cmd tea.Cmd
    m.list, cmd = m.list.Update(msg)
    return m, cmd
}

func (m feedbackModel) View() string {
    if m.mode == "submit" {
        return lipgloss.NewStyle().
            Border(lipgloss.RoundedBorder()).
            Padding(1).
            Render(
                "Submit Feedback\n\n" +
                m.textarea.View() +
                "\n\nPress Enter to submit, Esc to cancel",
            )
    }

    help := "n: new feedback  q: quit  ↑/↓: navigate  enter: details"
    return fmt.Sprintf(
        "%s\n\n%s",
        m.list.View(),
        lipgloss.NewStyle().Foreground(lipgloss.Color("241")).Render(help),
    )
}

type feedbackItem Feedback

func (i feedbackItem) FilterValue() string { return i.Message }
func (i feedbackItem) Title() string       { return i.Room + " - " + i.Status }
func (i feedbackItem) Description() string { return i.Message[:min(60, len(i.Message))] + "..." }

type feedbackDelegate struct{}

func (d feedbackDelegate) Height() int                             { return 2 }
func (d feedbackDelegate) Spacing() int                            { return 1 }
func (d feedbackDelegate) Update(_ tea.Msg, _ *list.Model) tea.Cmd { return nil }
func (d feedbackDelegate) Render(w io.Writer, m list.Model, index int, item list.Item) {
    i, ok := item.(feedbackItem)
    if !ok {
        return
    }

    statusColor := "green"
    if i.Status == "OPEN" {
        statusColor = "yellow"
    }

    str := fmt.Sprintf(
        "%s %s\n  %s",
        lipgloss.NewStyle().Foreground(lipgloss.Color(statusColor)).Render("●"),
        lipgloss.NewStyle().Bold(true).Render(i.Room),
        i.Message[:min(80, len(i.Message))],
    )

    fmt.Fprint(w, str)
}

// Commands
type feedbackLoadedMsg struct {
    feedback []Feedback
}

func loadFeedback() tea.Msg {
    // Call API to load feedback
    feedback, _ := api.ListFeedback("", "")
    return feedbackLoadedMsg{feedback: feedback}
}

func submitFeedback(message string) tea.Cmd {
    return func() tea.Msg {
        // Call API to submit
        return feedbackSubmittedMsg{}
    }
}
```

### 2. Integrate into Main Menu

**Update: `internal/tui/main.go`**
```go
// Add to menu options
menuItems := []list.Item{
    menuItem{title: "Rooms", desc: "Browse and book rooms"},
    menuItem{title: "My Bookings", desc: "View your bookings"},
    menuItem{title: "Feedback", desc: "Report issues or suggestions"},  // NEW
    menuItem{title: "Settings", desc: "Configure preferences"},
}

// Handle selection
case "Feedback":
    return NewFeedbackModel(), nil
```

---

## 🎯 **Testing Checklist**

### Backend (✅ Complete)
- [x] Create feedback via MCP tool
- [x] Read feedback by room
- [x] Read all feedback with filters
- [x] Update feedback status (manager permissions)
- [x] Email notification functions (ready, not tested)

### Chat Assistant (✅ Complete)
- [x] Submit feedback via natural language
- [x] Query feedback for rooms
- [x] Manager can update status

### Web App (❌ TODO)
- [ ] Generate OpenAPI types
- [ ] Create feedback components
- [ ] Add hooks for API calls
- [ ] Integrate into room pages
- [ ] Test feedback submission
- [ ] Test status updates (manager)
- [ ] Test public visibility

### CLI (❌ TODO)
- [ ] Add feedback commands
- [ ] Update API client
- [ ] Test submit command
- [ ] Test list command with filters
- [ ] Test resolve command (manager)

### TUI (❌ TODO)
- [ ] Create feedback view model
- [ ] Add to main menu
- [ ] Test submission flow
- [ ] Test list view
- [ ] Test status updates

---

## 🔑 **Key Features**

1. **Public Visibility**: All users can see all feedback (transparency)
2. **Manager Notifications**: Emails sent to location managers on new feedback
3. **Status Tracking**: OPEN → RESOLVED/DISMISSED workflow
4. **User Attribution**: Always show who submitted feedback
5. **Free-Form Text**: No categories - flexible feedback messages
6. **Integration Everywhere**: Chat, Web, CLI, TUI all support feedback

---

## 📝 **Notes**

- Email notifications use nodemailer but fall back to console logging if SMTP not configured
- Permissions: Anyone can create and update status (comment required for updates)
- Chat assistant automatically looks up room IDs when users mention room names
- All timestamps in ISO 8601 format
- Feedback is never deleted, only status updated

---

## 🚀 **Next Steps**

1. Implement web app feedback UI (highest priority - most users)
2. Add CLI commands (power users)
3. Enhance TUI with feedback screens (completeness)
4. Test email notifications with real SMTP
5. Add analytics/reporting for managers
