import React, { useState, useEffect} from 'react';
import { styled, alpha } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
// removed unused IconButton/MenuIcon imports
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import BasicDatePicker from './date_picker';
import dayjs, { Dayjs } from 'dayjs';

// Minimal event type used for client-side filtering
type EventItem = {
  title?: string
  description?: string
  categories?: string[] | string | null
  longitude?: number | string
  latitude?: number | string
  [k: string]: unknown
}

const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '');

/** Styles */
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
    marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
    },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    [theme.breakpoints.up('sm')]: {
      width: '12ch',
      '&:focus': {
        width: '20ch',
      },
    },
  },
}));

// Send search query and date to backend, return matching events
async function sendDataFromSearchBar(query: string | null, date?: Dayjs | null) {
  const q = String(query ?? '').trim();
  console.log('Search query to send:', q);

  const d = date ?? dayjs();
  const formatted_date = `${d.year()}-${(d.month() + 1).toString().padStart(2, '0')}-${d.date().toString().padStart(2, '0')}`;

  const base = (API_BASE || '').replace(/\/+$/,'');
  const url = `${base}/events/`;

  try {
    // Request all events for the day from the backend using the format you requested
    const resp = await axios.get(url, { params: { day: formatted_date, categories: 'all' }, timeout: 8000 });
    console.log('Events for day response data:', resp.data);

    const events = resp.data?.events || [];
    if (!q) {
      // No searching => return all events
      return events;
    }

    // make sure the input strings is in consistent lower case format without any signs
    const normalized = (s: string) => s.toLowerCase().replace(/\s+/g,' ').trim();

    // to support multiple categories: separated by ,
    const tokens = q.includes(',')
      ? q.split(',').map(t => normalized(t)).filter(Boolean)
      : [normalized(q)]
    if (tokens.length === 0) return events
    console.log('Category search tokens:', tokens)

    const matches = events.filter((event: EventItem) => {
      // Normalize categories to a single searchable string and match tokens (OR)
      let catsText = ''
      const c = event.categories
      if (Array.isArray(c)) {
        catsText = c.map(x => String(x || '')).join(' ')
      } else if (typeof c === 'string') {
        catsText = c
      }
      const catsNorm = normalized(catsText)
      if (!catsNorm) return false
      return tokens.some(t => catsNorm.includes(t))
    });

    console.log('Search matches:', matches);
    return matches;

  } catch (err) {
    console.error('Search request failed', err);
    return null;
  }
}

// Extract categories from search query 
function extractCategoriesFromQuery(q: string): string[] | null {
  if (!q) return null
  const m = q.match(/(?:cat|category):\s*([^\s#]+)/i)
  if (m && m[1]) {
    return m[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  }
  const tags = Array.from(q.matchAll(/#([^\s#]+)/g)).map(a => String(a[1]).toLowerCase())
  if (tags.length) return tags
  return null
}

async function handleSearchKey(
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  selectedDate?: Dayjs | null,
  onCategoriesFound?: (cats: string[]) => void,
  onSearchResults?: (results: Array<Record<string, unknown>> | null) => void
) {
  if (e.key === 'Enter') {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const value = target.value;
    console.log('Search query submitted:', value, '| date:', selectedDate?.toString());

    try {
      const tokenMatch = extractCategoriesFromQuery(value)
      if (tokenMatch && typeof onCategoriesFound === 'function') {
        try { onCategoriesFound(tokenMatch) } catch (err) { console.warn('onCategoriesFound failed', err) }
      }
    } catch (e) {
      console.warn('Category token extraction failed', e)
    }

    const results = await sendDataFromSearchBar(value, selectedDate);
    if (typeof onSearchResults === 'function') {
      try { onSearchResults(results) } catch (err) { console.warn('onSearchResults handler failed', err) }
    }
  }
}


type Props = {
  onDateChange?: (d: Dayjs) => void
  onCategoriesFound?: (cats: string[]) => void
  onSearchResults?: (results: Array<Record<string, unknown>> | null) => void
}


export default function SearchBar({ onDateChange, onCategoriesFound, onSearchResults }: Props) {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());

  // Avoid 
  const didMountRef = React.useRef(false)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (selectedDate && typeof onDateChange === 'function') {
      try { onDateChange(selectedDate) } catch (e) { console.warn('onDateChange handler failed', e) }
    }
  }, [selectedDate, onDateChange]);

  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1200 }}>
        <Toolbar>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          >
            ANTEATER EVENTS
                  </Typography>
                    <BasicDatePicker value={selectedDate} onChange={(d) => setSelectedDate(d)} />
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
                placeholder="Search..."
                    inputProps={{ 'aria-label': 'search' }}
                    onKeyDown={(e) => { void handleSearchKey(e, selectedDate, onCategoriesFound, onSearchResults) }}
            />
          </Search>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
