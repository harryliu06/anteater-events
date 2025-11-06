import { styled, alpha } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

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

async function sendDataFromSearchBar(query: string) {
    const q = String(query ?? '').trim();
    console.log('Search query to send:', q);
  if (!q) return null;

  
  const today = new Date();
  const formatted_date = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;

  const base = ((import.meta.env.VITE_API_URL as string|undefined) || '').replace(/\/+$/,'');
  const url = `${base}/events/search/`;

  try {
      const resp = await axios.get(url, { params: { day: formatted_date, search: q }, timeout: 8000 });
      console.log('Search response data:', resp.data);

    const events = resp.data?.events || [];

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

function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter') {
    const value = (e.target as HTMLInputElement).value;
    console.log('Search query submitted:', value);
    sendDataFromSearchBar(value);
      
  }
}


export default function SearchBar() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1200 }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="open drawer"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          >
            ANTEATER EVENTS
          </Typography>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
                placeholder="Search…"
                    inputProps={{ 'aria-label': 'search' }}
                    onKeyDown={handleSearchKey}
            />
          </Search>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
