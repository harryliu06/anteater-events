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

const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '');

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
      // No searchiing => return all events
      return events;
    }
    
    const normalized = (s: string) => s.toLowerCase().replace(/\s+/g,' ').trim();
    const needle = normalized(q);

    const matches = events.filter((event: any) => {
      const title = normalized(String(event.title || ''));
      const desc  = normalized(String(event.description || ''));
      return title.includes(needle) || desc.includes(needle);
    });

    console.log('Search matches:', matches);
    return matches;
  } catch (err) {
    console.error('Search request failed', err);
    return null;
  }
}

function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, selectedDate?: Dayjs | null) {
  if (e.key === 'Enter') {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const value = target.value;
    console.log('Search query submitted:', value, 'date:', selectedDate?.toString());
    sendDataFromSearchBar(value, selectedDate);
  }
}


type Props = {
  onDateChange?: (d: Dayjs) => void
}

export default function SearchBar({ onDateChange }: Props) {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());

  // Avoid notifying parent on initial mount — only notify when user actually changes the date
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
                    onKeyDown={(e) => handleSearchKey(e, selectedDate)}
            />
          </Search>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
