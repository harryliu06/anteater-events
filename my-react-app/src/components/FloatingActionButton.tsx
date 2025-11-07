import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import NavigationIcon from '@mui/icons-material/Navigation';

type Props = {
  onCreate?: () => void
  onEdit?: () => void
  onNavigate?: () => void
}

export default function FloatingActionButtons({ onCreate, onNavigate }: Props) {
  return (
    <div className="fab-container">
      <Box sx={{ '& > :not(style)': { m: 1 } }}>
        <Fab color="primary" aria-label="add" onClick={onCreate}>
          <AddIcon />
        </Fab>
        <Fab variant="extended" onClick={onNavigate}>
          <NavigationIcon sx={{ mr: 1 }} />
          Navigate
        </Fab>
      </Box>
    </div>
  );
}
