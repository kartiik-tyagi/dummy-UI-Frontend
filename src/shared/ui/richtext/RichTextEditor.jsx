import { useEffect } from 'react'
import { Box, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import TitleIcon from '@mui/icons-material/Title'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'

function Tool({ title, active, disabled, onClick, children }) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          aria-label={title}
          aria-pressed={active}
          color={active ? 'primary' : 'default'}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}

/**
 * TipTap HTML editor. Value is HTML string; onChange receives HTML.
 * Empty document becomes '' so the API can store null.
 */
export function RichTextEditor({ label, value, onChange, placeholder, error, helperText, minHeight = 160 }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: placeholder || 'Write here…' }),
    ],
    content: value || '',
    onUpdate: ({ editor: current }) => {
      const html = current.isEmpty ? '' : current.getHTML()
      onChange?.(html)
    },
    editorProps: {
      attributes: {
        'aria-label': label || 'Rich text',
        style: `min-height:${minHeight}px; outline:none;`,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const next = value || ''
    if (editor.getHTML() === next) return
    if (!next && editor.isEmpty) return
    editor.commands.setContent(next, false)
  }, [editor, value])

  return (
    <Box
      sx={{
        border: 1,
        borderColor: error ? 'error.main' : 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {label ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, pt: 1 }}>
          {label}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={0.25} useFlexGap sx={{ px: 0.75, py: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tool title="Heading" active={editor?.isActive('heading')} disabled={!editor} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <TitleIcon fontSize="small" />
        </Tool>
        <Tool title="Bold" active={editor?.isActive('bold')} disabled={!editor} onClick={() => editor.chain().focus().toggleBold().run()}>
          <FormatBoldIcon fontSize="small" />
        </Tool>
        <Tool title="Italic" active={editor?.isActive('italic')} disabled={!editor} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <FormatItalicIcon fontSize="small" />
        </Tool>
        <Tool title="Underline" active={editor?.isActive('underline')} disabled={!editor} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <FormatUnderlinedIcon fontSize="small" />
        </Tool>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Tool title="Bullet list" active={editor?.isActive('bulletList')} disabled={!editor} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <FormatListBulletedIcon fontSize="small" />
        </Tool>
        <Tool title="Numbered list" active={editor?.isActive('orderedList')} disabled={!editor} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <FormatListNumberedIcon fontSize="small" />
        </Tool>
      </Stack>
      <Divider />
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          '& .ProseMirror': {
            minHeight,
            color: 'text.primary',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            lineHeight: 1.65,
            '& p': { m: 0, mb: 1 },
            '& p:last-child': { mb: 0 },
            '& h2': { m: 0, mb: 1, fontSize: '1.15rem', fontWeight: 600 },
            '& ul, & ol': { m: 0, mb: 1, pl: 2.5 },
            '& strong': { fontWeight: 700 },
            '&.ProseMirror-focused': { outline: 'none' },
            '& p.is-editor-empty:first-of-type::before': {
              color: 'text.disabled',
              content: 'attr(data-placeholder)',
              float: 'left',
              height: 0,
              pointerEvents: 'none',
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
      {helperText ? (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ display: 'block', px: 1.5, pb: 1 }}>
          {helperText}
        </Typography>
      ) : null}
    </Box>
  )
}
