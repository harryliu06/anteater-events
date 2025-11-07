import React, { useState, useEffect, useRef } from 'react';
import { styled, alpha, useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
// removed unused IconButton/MenuIcon imports
import SearchIcon from '@mui/icons-material/Search';
import useMediaQuery from '@mui/material/useMediaQuery';
import IconButton from '@mui/material/IconButton';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RiGeminiFill } from 'react-icons/ri';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';
import BasicDatePicker from './date_picker';
import dayjs, { Dayjs } from 'dayjs';

// (removed unused EventItem type)

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

const RightIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  right: 0,
  top: 0,
  pointerEvents: 'auto',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.common.white,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    // reserve space on the right for the Gemini icon
    paddingRight: `calc(1em + ${theme.spacing(4)})`,
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
async function sendDataFromSearchBar(query: string | null, date?: Dayjs | null, useAi = false) {
  const q = String(query ?? '').trim();
  console.log('Search query to send:', q);

  const d = date ?? dayjs();
  const formatted_date = `${d.year()}-${(d.month() + 1).toString().padStart(2, '0')}-${d.date().toString().padStart(2, '0')}`;

  const base = (API_BASE || '').replace(/\/+$|$/, '');
  const url = `${base}/events/`;

  try {
    if (q) {
      // if input starts with #, then category search is triggered and search for categories match
      if (q.startsWith('#')) {
        const cats = extractCategoriesFromQuery(q);
        const categoriesParam = cats && cats.length ? cats.join(',') : 'all';
        console.log('Calling category-based events endpoint', { day: formatted_date, categories: categoriesParam });
        const resp = await axios.get(url, { params: { day: formatted_date, categories: categoriesParam }, timeout: 10000 });
        console.log('Category search response data:', resp.data);
        const evs = resp.data?.events ?? resp.data ?? [];
        return evs;
      }

      let fullUrl = '';
      if (useAi) {
        const aiUrl = `${base}/events/aisearch/`;
        fullUrl = `${aiUrl}?day=${encodeURIComponent(formatted_date)}&search=${encodeURIComponent(q)}`;
        console.log('Calling AI search endpoint', fullUrl);
      } else {
        const searchUrl = `${base}/events/search/`;
        fullUrl = `${searchUrl}?day=${encodeURIComponent(formatted_date)}&search=${encodeURIComponent(q)}`;
        console.log('Calling standard search endpoint', fullUrl);
      }

      const resp = await axios.get(fullUrl, { timeout: 10000 });
      console.log('Search response data:', resp.data);
      const evs = resp.data?.events ?? resp.data ?? [];
      return evs;
    }

    const resp = await axios.get(url, { params: { day: formatted_date, categories: 'all' }, timeout: 8000 });
    console.log('Events for day response data:', resp.data);
    const events = resp.data?.events || [];
    return events;
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
  onSearchResults?: (results: Array<Record<string, unknown>> | null) => void,
) {
  if (e.key !== 'Enter') return;
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  const value = target.value;
  console.log('Search query submitted:', value, '| date:', selectedDate?.toString());

  try {
    const tokenMatch = extractCategoriesFromQuery(value);
    if (tokenMatch && typeof onCategoriesFound === 'function') {
      try { onCategoriesFound(tokenMatch); } catch (err) { console.warn('onCategoriesFound failed', err); }
      return
    }
  } catch (e) {
    console.warn('Category token extraction failed', e);
  }

  const results = await sendDataFromSearchBar(value, selectedDate, false);
  if (typeof onSearchResults === 'function') {
    try { onSearchResults(results); } catch (err) { console.warn('onSearchResults handler failed', err); }
  }
}


type Props = {
  onDateChange?: (d: Dayjs) => void
  onCategoriesFound?: (cats: string[]) => void
  onSearchResults?: (results: Array<Record<string, unknown>> | null) => void
}


export default function SearchBar({ onDateChange, onCategoriesFound, onSearchResults }: Props) {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searching, setSearching] = useState(false);

  // responsive/mobile date-picker support
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);

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

  // AI Click Trigger
  const onGeminiActivate = async () => {
    if (searching) return;
    const q = String(inputRef.current?.value ?? '').trim();
    if (!q) return;
    // if query contains #tags, treat as category search — notify parent and do not run AI
    const cats = extractCategoriesFromQuery(q)
    if (cats && typeof onCategoriesFound === 'function') {
      try { onCategoriesFound(cats) } catch (err) { console.warn('onCategoriesFound failed', err) }
      return
    }
    setSearching(true);
    try {
      const results = await sendDataFromSearchBar(q, selectedDate, true);
      if (typeof onSearchResults === 'function') {
        try { onSearchResults(results); } catch (err) { console.warn('onSearchResults handler failed', err); }
      }
    } catch (err) {
      console.error('AI search failed', err);
    } finally {
      setSearching(false);
    }
  };

  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1200 }}>
        <Toolbar className="toolbar">
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          >
            ANTEATER EVENTS
          </Typography>
          
          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                aria-label="Select date"
                onClick={() => setMobilePickerOpen(true)}
                sx={{ mr: 1 }}
              >
                <CalendarTodayIcon />
              </IconButton>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  open={mobilePickerOpen}
                  onClose={() => setMobilePickerOpen(false)}
                  value={selectedDate}
                  onChange={(d) => setSelectedDate(d)}
                  slotProps={{ textField: { sx: { display: 'none' } } }}
                />
              </LocalizationProvider>
            </>
          ) : (
            <Box sx={{ mr: { xs: 1, sm: 2, md: 3 }, display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
              <BasicDatePicker value={selectedDate} onChange={(d) => setSelectedDate(d)} />
            </Box>
          )}
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
                placeholder="Search..."
                    inputProps={{ 'aria-label': 'search' }}
                    inputRef={inputRef}
                    onKeyDown={(e) => { void handleSearchKey(e, selectedDate, onCategoriesFound, onSearchResults) }}
            />
            <RightIconWrapper
              role="button"
              tabIndex={0}
              aria-label="AI search"
              onClick={() => { void onGeminiActivate(); }}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); void onGeminiActivate(); } }}
            >
              {searching ? <CircularProgress size={18} color="inherit" /> : <RiGeminiFill size={18} />}
            </RightIconWrapper>
          </Search>
          
        </Toolbar>
        
      </AppBar>
    </Box>
  );
}
