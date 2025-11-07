import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import NavigationIcon from '@mui/icons-material/Navigation';

type Props = {
  onCreate?: () => void
}

export default function FloatingActionButtons({ onCreate }: Props) {
  return (
    <div className="fab-container">
      <Box sx={{ '& > :not(style)': { m: 1 } }}>
        <Fab color="primary" aria-label="add" onClick={onCreate}>
          <AddIcon />
        </Fab>
      </Box>
    </div>
  );
}
